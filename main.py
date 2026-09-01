import json
import os

def load_portfolio_data(json_path):
    """Loads portfolio data from the content.json file."""
    try:
        with open(json_path, 'r') as file:
            data = json.load(file)
            print(f"Successfully loaded data for: {data['profile']['name']}")
            return data
    except FileNotFoundError:
        print(f"Error: Could not find {json_path}")
        return None

def build_site():
    # Adjust path to point to the root folder where content.json lives
    json_file = os.path.join(os.path.dirname(__file__), '..', 'content.json')
    
    portfolio_data = load_portfolio_data(json_file)
    
    if portfolio_data:
        print("Ready to generate HTML templates...")
        # Future step: Add logic here to overwrite index.html with the JSON data

if __name__ == "__main__":
    build_site()