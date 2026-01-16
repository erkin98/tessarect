$(function () {
  'use strict';

  const $inputs = $('.inputfile');
  const $selectedImage = $('#selected-image');
  const $arrowRight = $('#arrow-right');
  const $arrowDown = $('#arrow-down');
  const $arrowIcons = $('#arrow-right, #arrow-down');
  const $log = $('#log');
  const $langSelect = $('#langsel');
  const logElement = $log.get(0);

  const ICONS = {
    right: 'fa-arrow-right',
    down: 'fa-arrow-down',
    spinner: 'fa-spinner fa-spin',
    success: 'fa-check',
    error: 'fa-times',
  };

  const clearLog = () => $log.empty();

  const setIconState = (state) => {
    $arrowRight.removeClass(
      `${ICONS.right} ${ICONS.spinner} ${ICONS.success} ${ICONS.error}`
    );
    $arrowDown.removeClass(
      `${ICONS.down} ${ICONS.spinner} ${ICONS.success} ${ICONS.error}`
    );

    if (state === 'loading') {
      $arrowIcons.addClass(ICONS.spinner);
      return;
    }
    if (state === 'success') {
      $arrowIcons.addClass(ICONS.success);
      return;
    }
    if (state === 'error') {
      $arrowIcons.addClass(ICONS.error);
      return;
    }

    $arrowRight.addClass(ICONS.right);
    $arrowDown.addClass(ICONS.down);
  };

  const setSelectedImage = (src) => {
    $selectedImage.attr('src', src);
    if (src) {
      $selectedImage.addClass('col-12');
    } else {
      $selectedImage.removeClass('col-12');
    }
  };

  const setLabelText = (labelTarget, text) => {
    if (labelTarget) {
      labelTarget.textContent = text;
    }
  };

  const getFileName = (input) => {
    if (input.files && input.files.length > 1) {
      const caption = input.getAttribute('data-multiple-caption') || '';
      return caption.replace('{count}', input.files.length);
    }

    if (input.files && input.files.length === 1) {
      return input.files[0].name;
    }

    const rawValue = input.value || '';
    return rawValue.split('\\').pop();
  };

  const renderPreview = (file) => {
    const reader = new FileReader();
    reader.onload = function () {
      setSelectedImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const resetUi = (labelTarget, labelText) => {
    setLabelText(labelTarget, labelText);
    setSelectedImage('');
    setIconState('idle');
    clearLog();
  };

  const startRecognize = (source) => {
    setIconState('loading');
    recognizeFile(source);
  };

  const handleInputChange = (event, labelTarget, labelText) => {
    const input = event.currentTarget;
    const fileName = getFileName(input);

    if (!fileName) {
      resetUi(labelTarget, labelText);
      return;
    }

    setLabelText(labelTarget, fileName);

    const file = input.files && input.files[0];
    if (!file) {
      resetUi(labelTarget, labelText);
      return;
    }

    renderPreview(file);
    startRecognize(file);
  };

  const attachInputHandlers = (input) => {
    const label = input.nextElementSibling;
    const labelSpan = label ? label.querySelector('span') : null;
    const labelTarget = labelSpan || label;
    const labelText = labelTarget ? labelTarget.textContent : '';

    input.addEventListener('change', function (event) {
      handleInputChange(event, labelTarget, labelText);
    });

    // Firefox bug fix
    input.addEventListener('focus', function () {
      input.classList.add('has-focus');
    });
    input.addEventListener('blur', function () {
      input.classList.remove('has-focus');
    });
  };

  const progressUpdate = (packet) => {
    if (logElement.firstChild && logElement.firstChild.status === packet.status) {
      if ('progress' in packet) {
        const progress = logElement.firstChild.querySelector('progress');
        if (progress) {
          progress.value = packet.progress;
        }
      }
      return;
    }

    const line = document.createElement('div');
    line.status = packet.status;
    const status = document.createElement('div');
    status.className = 'status';
    status.appendChild(document.createTextNode(packet.status));
    line.appendChild(status);

    if ('progress' in packet) {
      const progress = document.createElement('progress');
      progress.value = packet.progress;
      progress.max = 1;
      line.appendChild(progress);
    }

    if (packet.status === 'done') {
      logElement.innerHTML = '';
      const pre = document.createElement('pre');
      pre.appendChild(
        document.createTextNode(packet.data.text.replace(/\n\s*\n/g, '\n'))
      );
      line.innerHTML = '';
      line.appendChild(pre);
      setIconState('success');
    }

    logElement.insertBefore(line, logElement.firstChild);
  };

  const renderError = (message) => {
    logElement.innerHTML = '';

    const line = document.createElement('div');
    const status = document.createElement('div');
    status.className = 'status error';
    status.appendChild(document.createTextNode(message));
    line.appendChild(status);
    logElement.appendChild(line);

    setIconState('error');
  };

  const recognizeFile = (source) => {
    clearLog();
    const isEdgeLegacy = window.navigator.userAgent.indexOf('Edge') > -1;
    const corePath = isEdgeLegacy
      ? 'js/tesseract-core.asm.js'
      : 'js/tesseract-core.wasm.js';

    const worker = new Tesseract.TesseractWorker({ corePath });

    worker
      .recognize(source, $langSelect.val())
      .progress(function (packet) {
        console.info(packet);
        progressUpdate(packet);
      })
      .then(function (data) {
        console.log(data);
        progressUpdate({ status: 'done', data: data });
      })
      .catch(function (err) {
        console.error(err);
        renderError('OCR failed. Please try another image.');
      })
      .then(function () {
        worker.terminate();
      });
  };

  $inputs.each(function () {
    attachInputHandlers(this);
  });

  $('#startLink').on('click', function () {
    const img = document.getElementById('selected-image');
    startRecognize(img);
  });
});