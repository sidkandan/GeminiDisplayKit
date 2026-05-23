import os
import json
import time
from google import genai
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

client = genai.Client()

env_config = {
    "type": "remote",
    "sources": [
        {
            "type": "inline",
            "target": "hello.txt",
            "content": "Hello from custom source file!"
        }
    ]
}

print("Creating interaction with custom environment...")
try:
    interaction = client.interactions.create(
        agent="antigravity-preview-05-2026",
        input="Read the content of hello.txt using code execution or bash, print it, and respond OK.",
        environment=env_config
    )
    print("Success!")
    print("Output:", interaction.output_text)
except Exception as e:
    import traceback
    traceback.print_exc()
