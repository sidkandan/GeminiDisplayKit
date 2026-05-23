import os
import base64
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

client = genai.Client()

prompt = "A simple retro 2D pixel-art icon of a water dragon monster, clean white background, digital game sprite style."

print("Listing models...")
try:
    for m in client.models.list():
        if 'tts' in m.name.lower() or 'flash' in m.name.lower():
            print("Found model:", m.name)
except Exception as e:
    import traceback
    traceback.print_exc()
