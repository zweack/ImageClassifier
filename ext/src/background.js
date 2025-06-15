import * as ort from 'onnxruntime-web';

class ImageClassifierBackground {
    constructor() {
        this.labels = null;
        this.session = null;
        this.init();
    }

    async init() {
        await this.loadModelAndLabels();
        this.setupContextMenu();
        this.setupListeners();
    }

    async loadModelAndLabels() {
        if (!this.session) {
            const modelUrl = chrome.runtime.getURL('model.onnx');
            this.session = await ort.InferenceSession.create(modelUrl);
        }
        if (!this.labels) {
            const labelsUrl = chrome.runtime.getURL('labels.json');
            this.labels = await fetch(labelsUrl).then(r => r.json());
        }
    }

    setupContextMenu() {
        chrome.contextMenus.create({
            id: 'classify-image',
            title: 'Classify this image',
            contexts: ['image']
        });
        chrome.runtime.onInstalled.addListener(() => {
            chrome.contextMenus.create({
                id: 'classify-image',
                title: 'Classify this image',
                contexts: ['image']
            });
        });

        chrome.contextMenus.onClicked.addListener((info, tab) => {
            if (info.menuItemId === 'classify-image' && info.srcUrl) {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'classify-image',
                    imageUrl: info.srcUrl
                });
            }
        });
    }

    setupListeners() {
        chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
            if (message.action === 'run-inference' && message.tensorData && message.tensorShape) {
                try {
                    await this.loadModelAndLabels();
                    const outputNames = this.session.outputNames;
                    const tensor = new ort.Tensor('float32', new Float32Array(message.tensorData), message.tensorShape);
                    const feeds = {};
                    feeds[this.session.inputNames[0]] = tensor;
                    const results = await this.session.run(feeds);
                    const output = results[outputNames[0]].data;
                    let maxScore = -Infinity;
                    let maxIndex = -1;
                    for (let i = 0; i < output.length; i++) {
                        if (output[i] > maxScore) {
                            maxScore = output[i];
                            maxIndex = i;
                        }
                    }
                    let labelRes = {
                        label: this.labels[maxIndex],
                        confidence: (1 / (1 + Math.exp(-maxScore)))
                    };
                    chrome.tabs.sendMessage(sender.tab.id, {
                        action: 'inference-result',
                        result: labelRes
                    });
                } catch (e) {
                    chrome.tabs.sendMessage(sender.tab.id, {
                        action: 'inference-result',
                        error: e.toString()
                    });
                }
            }
        });
    }
}

new ImageClassifierBackground();

