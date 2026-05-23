import os
import sys
import json
import wave
import time
import argparse
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

client = genai.Client()

def save_wave_file(filename, pcm, channels=1, rate=24000, sample_width=2):
    with wave.open(filename, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sample_width)
        wf.setframerate(rate)
        wf.writeframes(pcm)

def generate_tts_file(filename_base, text, voice="Charon"):
    output_dir = "static/audio"
    os.makedirs(output_dir, exist_ok=True)
    
    # Save as both .wav and .mp3 (containing wav bytes) for maximum compatibility with UI code
    wav_path = os.path.join(output_dir, f"{filename_base}.wav")
    mp3_path = os.path.join(output_dir, f"{filename_base}.mp3")
    
    # Skip if both exist
    if os.path.exists(wav_path) and os.path.exists(mp3_path):
        print(f"[TTS] '{filename_base}' already exists. Skipping.")
        return True
        
    print(f"[TTS] Generating audio for: '{text}' using voice '{voice}'...")
    
    config = types.GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name=voice
                )
            )
        )
    )
    
    # Retry loop with backoff for rate limits
    max_retries = 5
    delay = 6
    
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-3.1-flash-tts-preview",
                contents=text,
                config=config
            )
            
            parts = response.candidates[0].content.parts
            audio_data = None
            for p in parts:
                if p.inline_data:
                    audio_data = p.inline_data.data
                    break
                    
            if audio_data:
                # Save files
                save_wave_file(wav_path, audio_data)
                save_wave_file(mp3_path, audio_data)
                print(f"[TTS] Saved audio to {wav_path} and {mp3_path}")
                return True
            else:
                print(f"[TTS] No audio data returned for '{filename_base}'.")
                return False
                
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print(f"[TTS] Rate limited on attempt {attempt+1}/{max_retries}. Sleeping {delay}s...")
                time.sleep(delay)
                delay *= 1.5
            else:
                print(f"[TTS] Failed to generate audio for '{filename_base}': {e}")
                return False
                
    print(f"[TTS] Failed to generate audio for '{filename_base}' after {max_retries} attempts.")
    return False

def main():
    parser = argparse.ArgumentParser(description="Prompt Arena Sportscaster TTS Generator")
    args = parser.parse_args()
    
    # 1. Generate general round introductions
    round_intros = {
        "intro_quarterfinals": "Welcome to the Quarterfinals of the Prompt Arena! Eight monsters enter, but only one will be crowned champion!",
        "intro_semifinals": "We have reached the Semifinals! Four elite coached monsters remain. The tension is rising!",
        "intro_finals": "This is it! The Grand Finals of the Prompt Arena! Two legendary creatures face off for ultimate glory!"
    }
    
    for key, text in round_intros.items():
        generate_tts_file(key, text, voice="Charon")
        
    # 2. Generate custom champion calls for all monsters
    with open("data/monsters.json") as f:
        monsters_data = json.load(f)
    monsters_list = monsters_data["monsters"]
    
    print(f"Generating champion calls for {len(monsters_list)} monsters...")
    for m in monsters_list:
        m_id = m["id"]
        name = m["name"]
        catchphrase = m.get("catchphrase", "")
        
        champ_text = f"And the winner is {name}! {catchphrase} What an incredible victory! {name} is the ultimate champion of the Prompt Arena!"
        generate_tts_file(f"champion_{m_id}", champ_text, voice="Charon")

if __name__ == "__main__":
    main()
