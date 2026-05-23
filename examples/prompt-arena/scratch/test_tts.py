import os
import wave
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

client = genai.Client()

config = types.GenerateContentConfig(
    response_modalities=["AUDIO"],
    response_mime_type="audio/mp3",
    speech_config=types.SpeechConfig(
        voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                voice_name="Puck"
            )
        )
    )
)

print("Generating audio...")
try:
    response = client.models.generate_content(
        model="gemini-3.1-flash-tts-preview",
        contents="Welcome to the Prompt Arena! Get ready for an absolute clash of monsters!",
        config=config
    )
    print("Success!")
    
    # Locate audio data
    parts = response.candidates[0].content.parts
    audio_data = None
    for p in parts:
        if p.inline_data:
            audio_data = p.inline_data.data
            print("Found audio data part!")
            break
            
    if audio_data:
        os.makedirs("scratch", exist_ok=True)
        # Save PCM data as WAV
        def save_wave_file(filename, pcm, channels=1, rate=24000, sample_width=2):
            with wave.open(filename, "wb") as wf:
                wf.setnchannels(channels)
                wf.setsampwidth(sample_width)
                wf.setframerate(rate)
                wf.writeframes(pcm)
        
        save_wave_file("scratch/test_tts.wav", audio_data)
        print("Saved test audio to scratch/test_tts.wav")
    else:
        print("Error: No inline audio data found in response.")
except Exception as e:
    import traceback
    traceback.print_exc()
