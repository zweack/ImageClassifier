class ImageClassifierContent {
  constructor() {
    this.listenForMessages();
  }

  listenForMessages() {
    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
      if (request.action === 'classify-image' && request.imageUrl) {
        try {
          this.showNotification('Classifying image...', 'info');
          // Fetch the image as a blob
          const response = await fetch(request.imageUrl);
          const blob = await response.blob();
          const img = await createImageBitmap(blob);

          // Preprocess image to [1, 3, 224, 224] Float32Array
          const floatData = await this.preprocessImage(img);
          // Send tensor data to background for inference
          chrome.runtime.sendMessage({
            action: 'run-inference',
            tensorData: Array.from(floatData),
            tensorShape: [1, 3, 224, 224]
          });
        } catch (e) {
          this.showNotification('Error preparing image: ' + e, 'error');
        }
      } else if (request.action === 'inference-result') {
        if (request.error) {
          this.showNotification('Inference error: ' + request.error, 'error');
        } else {
          // Expecting result: { label: string, confidence: number }
          const result = request.result;
          if (result && result.label && typeof result.confidence === 'number') {
            this.showNotification(`This appears to be: ${result.label} (${(result.confidence * 100).toFixed(2)}% confidence)`, 'success');
          } else {
            this.showNotification('Classification result: ' + JSON.stringify(result), 'success');
          }
        }
      }
    });
  }

  async preprocessImage(img) {
    const canvas = new OffscreenCanvas(224, 224);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 224, 224);
    const imageData = ctx.getImageData(0, 0, 224, 224).data;
    const floatData = new Float32Array(1 * 3 * 224 * 224);
    for (let i = 0; i < 224 * 224; i++) {
      floatData[i] = imageData[i * 4] / 255.0; // R
      floatData[i + 224 * 224] = imageData[i * 4 + 1] / 255.0; // G
      floatData[i + 2 * 224 * 224] = imageData[i * 4 + 2] / 255.0; // B
    }
    return floatData;
  }

  showNotification(message, type) {
    const old = document.getElementById('image-classifier-notification');
    if (old) old.remove();
    const div = document.createElement('div');
    div.id = 'image-classifier-notification';
    div.textContent = message;
    div.style.position = 'fixed';
    div.style.top = '32px';
    div.style.right = '32px';
    div.style.zIndex = 99999;
    if (type === 'success') {
      div.style.background = '#27ae60';
    } else if (type === 'error') {
      div.style.background = '#ff4d4f';
    } else {
      div.style.background = '#222';
    }
    div.style.color = '#fff';
    div.style.padding = '16px 24px';
    div.style.borderRadius = '8px';
    div.style.boxShadow = '0 2px 12px rgba(0,0,0,0.2)';
    div.style.fontSize = '16px';
    div.style.fontFamily = 'sans-serif';
    div.style.cursor = 'pointer';
    div.style.transition = 'opacity 0.3s';
    div.onclick = () => div.remove();
    document.body.appendChild(div);
    setTimeout(() => {
      div.style.opacity = '0';
      setTimeout(() => div.remove(), 300);
    }, 4000);
  }
}

new ImageClassifierContent();
