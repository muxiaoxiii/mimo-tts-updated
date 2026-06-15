var langMap = new Map([
    ['zh-Hans', 'zh'],
    ['zh-Hant', 'zh'],
    ['en', 'en'],
    ['ja', 'ja'],
    ['ko', 'ko'],
]);

var langMapReverse = new Map([
    ['zh', 'zh-Hans'],
    ['en', 'en'],
    ['ja', 'ja'],
    ['ko', 'ko'],
]);

function supportLanguages() {
    return ['zh-Hans', 'zh-Hant', 'en', 'ja', 'ko'];
}

function getBaseUrl() {
    var option = $option.baseUrlOption || 'default';
    
    if (option === 'default') {
        return 'https://api.xiaomimimo.com/v1';
    } else if (option === 'tokenplan') {
        return 'https://token-plan-cn.xiaomimimo.com/v1';
    } else if (option === 'custom') {
        var customUrl = $option.customBaseUrl || '';
        if (!customUrl) {
            return 'https://api.xiaomimimo.com/v1';
        }
        // 确保 URL 不以 / 结尾
        return customUrl.replace(/\/+$/, '');
    }
    
    return 'https://api.xiaomimimo.com/v1';
}

function doTtsRequest(apiKey, text, voice, completion) {
    var baseUrl = getBaseUrl();
    var endpoint = baseUrl + '/chat/completions';
    
    $http.request({
        method: 'POST',
        url: endpoint,
        header: {
            'api-key': apiKey,
            'Content-Type': 'application/json'
        },
        body: {
            model: 'mimo-v2.5-tts',
            stream: false,
            messages: [
                {
                    role: 'user',
                    content: 'Read the following text in a natural, clear voice.'
                },
                {
                    role: 'assistant',
                    content: text
                }
            ],
            audio: {
                format: 'wav',
                voice: voice
            }
        },
        handler: function(resp) {
            if (resp.error) {
                completion({
                    error: {
                        type: 'network',
                        message: '网络请求失败: ' + resp.error
                    }
                });
                return;
            }

            try {
                var data = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;

                if (data.error) {
                    completion({
                        error: {
                            type: 'api',
                            message: data.error.message || JSON.stringify(data.error),
                            addition: data
                        }
                    });
                    return;
                }

                var audioBase64 = data.choices[0].message.audio.data;
                completion({
                    result: {
                        type: 'base64',
                        value: audioBase64,
                        raw: data
                    },
                    audioBase64: audioBase64
                });
            } catch (e) {
                completion({
                    error: {
                        type: 'api',
                        message: '解析响应失败: ' + e.message,
                        addition: typeof resp.data === 'string' ? resp.data.substring(0, 500) : resp.data
                    }
                });
            }
        }
    });
}

function tts(query, completion) {
    var apiKey = $option.apiKey;
    if (!apiKey) {
        completion({
            error: {
                type: 'secretKey',
                message: '请在插件设置中填写 API Key'
            }
        });
        return;
    }

    var voice = $option.voice || 'mimo_default';
    doTtsRequest(apiKey, query.text, voice, function(resp) {
        if (resp.error) {
            completion({ error: resp.error });
            return;
        }
        completion({
            result: {
                type: 'base64',
                value: resp.audioBase64,
                raw: resp.result.raw
            }
        });
    });
}

function pluginValidate(completion) {
    var apiKey = $option.apiKey;
    if (!apiKey) {
        completion({
            result: false,
            error: {
                type: 'secretKey',
                message: '请先填写 API Key'
            }
        });
        return;
    }

    var voice = $option.voice || 'mimo_default';
    var previewText = '你好，这是音色试听。Hello, this is a voice preview.';

    doTtsRequest(apiKey, previewText, voice, function(resp) {
        if (resp.error) {
            completion({
                result: false,
                error: resp.error
            });
            return;
        }
        completion({ result: true });
    });
}

function pluginTimeoutInterval() {
    return 60;
}
