
/**
 * Text-to-Speech Engine
 * Multi-language support using Web Speech API
 */

class TTSEngine {
    constructor() {
        this.synthesis = window.speechSynthesis;
        this.voices = [];
        this.currentUtterance = null;
        this.isPlaying = false;
        this.loadVoices();
    }

    loadVoices() {
        this.voices = this.synthesis.getVoices();
        
        if (this.voices.length === 0) {
            this.synthesis.addEventListener('voiceschanged', () => {
                this.voices = this.synthesis.getVoices();
            });
        }
    }

    getVoicesByLanguage(lang = 'en-US') {
        return this.voices.filter(v => v.lang.startsWith(lang.split('-')[0]));
    }

    speak(text, options = {}) {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options.rate || 1.0;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;
        utterance.lang = options.lang || 'en-US';

        const voices = this.getVoicesByLanguage(utterance.lang);
        if (voices.length > 0) {
            utterance.voice = voices[0];
        }

        utterance.onstart = () => {
            this.isPlaying = true;
            if (options.onStart) options.onStart();
        };

        utterance.onend = () => {
            this.isPlaying = false;
            if (options.onEnd) options.onEnd();
        };

        utterance.onerror = (e) => {
            console.error('TTS error:', e);
            this.isPlaying = false;
        };

        this.currentUtterance = utterance;
        this.synthesis.speak(utterance);
    }

    pause() {
        this.synthesis.pause();
        this.isPlaying = false;
    }

    resume() {
        this.synthesis.resume();
        this.isPlaying = true;
    }

    stop() {
        this.synthesis.cancel();
        this.isPlaying = false;
    }

    getSupportedLanguages() {
        const languages = new Set();
        this.voices.forEach(v => languages.add(v.lang));
        return Array.from(languages).sort();
    }
}

// Initialize TTS
const ttsEngine = new TTSEngine();
window.ttsEngine = ttsEngine;
