import os
import sys
import json
import time
import argparse
from concurrent.futures import ThreadPoolExecutor
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

client = genai.Client()

def generate_sprite(monster, force=False):
    m_id = monster["id"]
    name = monster["name"]
    element = monster["element"]
    
    output_dir = "static/sprites"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{m_id}.png")
    
    if os.path.exists(output_path) and not force:
        print(f"[{name}] Sprite already exists at {output_path}. Skipping.")
        return True
        
    print(f"[{name}] Generating sprite...")
    
    # Custom descriptive prompts based on elements to make the sprites look beautiful and thematic
    theme_descriptors = {
        "pyro": "fire, flame, lava, ember theme, warm glowing accents",
        "flora": "leaves, vines, thorns, forest growth, natural green tones",
        "aqua": "water waves, coral reef, bubble effects, deep blue/teal colors",
        "gale": "wind vortex, cloud storm, feather/wind gusts, light sky colors",
        "volt": "electric sparks, lightning bolts, energy discharge, yellow glowing arcs",
        "terra": "crystals, rocks, earth stone, solid ground textures, brown/gray rock colors"
    }
    
    descriptor = theme_descriptors.get(element, "elemental theme")
    
    prompt = (
        f"A clear retro 2D pixel-art creature sprite of a {name} monster. "
        f"The element is {element} (depicting {descriptor}). "
        f"Style: clean, isolated on a simple plain solid white background, high contrast, perfect for a digital game mascot icon."
    )
    
    # Retry loop with backoff for rate limits
    max_retries = 5
    delay = 12 # Start with 12s sleep because Imagen rate limits are usually per-minute or per-10-seconds
    
    for attempt in range(max_retries):
        try:
            response = client.models.generate_images(
                model='imagen-4.0-generate-001',
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio="1:1",
                    output_mime_type="image/png"
                )
            )
            
            if response.generated_images:
                image_bytes = response.generated_images[0].image.image_bytes
                with open(output_path, "wb") as f:
                    f.write(image_bytes)
                print(f"[{name}] Sprite successfully saved to {output_path}.")
                return True
            else:
                print(f"[{name}] Failed to generate image: no images returned.")
                return False
                
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print(f"[{name}] Rate limited on attempt {attempt+1}/{max_retries}. Sleeping {delay}s...")
                time.sleep(delay)
                delay *= 1.5
            else:
                print(f"[{name}] Image generation failed: {e}")
                return False
                
    print(f"[{name}] Failed to generate sprite after {max_retries} attempts due to rate limit.")
    return False

def main():
    parser = argparse.ArgumentParser(description="Prompt Arena Sprite Generator")
    parser.add_argument("--force", action="store_true", help="Overwrite existing sprites")
    parser.add_argument("--id", type=str, help="Generate sprite for a specific monster ID")
    args = parser.parse_args()
    
    with open("data/monsters.json") as f:
        monsters_data = json.load(f)
    monsters_list = monsters_data["monsters"]
    
    if args.id:
        monsters_list = [m for m in monsters_list if m["id"] == args.id]
        if not monsters_list:
            print(f"Monster ID {args.id} not found in monsters.json.")
            sys.exit(1)
            
    print(f"Generating sprites for {len(monsters_list)} monsters...")
    
    # Run sequentially to avoid safety filters or rate limits tripping on parallel calls
    for m in monsters_list:
        generate_sprite(m, force=args.force)

if __name__ == "__main__":
    main()
