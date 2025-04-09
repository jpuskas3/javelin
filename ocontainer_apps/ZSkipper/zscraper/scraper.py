import requests
from bs4 import BeautifulSoup
import json
import os

class Scraper:
    def __init__(self, url, output_file):
        self.url = url
        self.output_file = output_file

    def scrape(self):
        try:
            response = requests.get(self.url)
            soup = BeautifulSoup(response.content, 'html.parser')

            # Modify this to scrape the data you need (for example, headlines)
            headlines = []
            for item in soup.find_all('h2'):  # Example of finding <h2> tags
                headlines.append(item.get_text())

            # Ensure the 'data' directory exists
            os.makedirs('data', exist_ok=True)

            # Save or update the scraped data to the output file
            with open(self.output_file, 'w') as f:
                json.dump({'headlines': headlines}, f)

            print(f"Scraped data saved to {self.output_file}")
            return {'headlines': headlines}
        except Exception as e:
            print(f"Error: {e}")
            return {"error": str(e)}

# Example usage
if __name__ == "__main__":
    scraper = Scraper('https://example.com', 'data/scraped_data.json')
    scraper.scrape()
