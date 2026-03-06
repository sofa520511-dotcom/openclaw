import urllib.request
import json
import os
from datetime import datetime
import cgi

# --- HTML and CSS Template ---
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>台灣運彩盤口自動分析</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            background-color: #f4f4f4;
            color: #333;
            margin: 0;
            padding: 20px;
        }}
        .container {{
            max-width: 900px;
            margin: auto;
            background: #fff;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        h1, h2 {{
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }}
        .game-card {{
            background: #fdfdfd;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
        }}
        .game-title {{
            font-size: 1.2em;
            font-weight: bold;
            color: #34495e;
            margin-bottom: 10px;
        }}
        .game-meta {{
            font-size: 0.9em;
            color: #7f8c8d;
            margin-bottom: 15px;
        }}
        .odds-list {{
            list-style-type: none;
            padding: 0;
        }}
        .odds-list li {{
            background: #ecf0f1;
            padding: 8px 12px;
            border-radius: 3px;
            margin-bottom: 5px;
            font-family: "Courier New", Courier, monospace;
        }}
        .footer {{
            text-align: center;
            margin-top: 30px;
            font-size: 0.8em;
            color: #95a5a6;
        }}
        .status-no-odds {{
            color: #e74c3c;
        }}
        .status-no-market {{
             color: #f39c12;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>台灣運彩盤口自動分析</h1>
        <p class="footer">最後更新時間: {update_time}</p>
        <div id="game-list">
            {game_cards}
        </div>
        <div class="footer">
            <p>由 ClawBot 自動生成 | 資料來源: 台灣運彩</p>
        </div>
    </div>
</body>
</html>
"""

# API Endpoints
SCHEDULE_URL = "https://blob.sportslottery.com.tw/apidata/Live/BetSchedule.json"
ODDS_URL_TEMPLATE = "https://blob3rd.sportslottery.com.tw/apidata/Pre/{sport_id}-Games.zh.json"

# A manually compiled dictionary to map sport names to their data file IDs.
SPORT_ID_MAP = {
    "足球": "34740.1",
    "籃球": "34765.1",
    "棒球": "34771.1",
    "網球": "34768.1",
    "冰球": "34744.1",
}

def fetch_json_data(url):
    """Fetches JSON data from a given URL using urllib."""
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response:
            if response.status != 200:
                print(f"Error: Status code {response.status} for {url}")
                return None
            data = response.read().decode('utf-8')
            return json.loads(data)
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def analyze_market_html(market):
    """Analyzes a single market and returns an HTML list item string."""
    market_type = market.get('v')
    choices = market.get('cs', [])
    
    if not choices:
        return ""

    # Sanitize inputs to prevent XSS if ever used in a more complex web app
    escape = cgi.escape

    if market_type == "ML":
        if len(choices) >= 2:
            away_odds = escape(str(choices[0].get('o', 'N/A')))
            home_odds = escape(str(choices[1].get('o', 'N/A')))
            return f"<li><strong>不讓分</strong> &nbsp; 客: {away_odds} | 主: {home_odds}</li>"
        
    elif market_type == "HDC":
        if len(choices) >= 2:
            away_team_name = escape(choices[0].get('name', '客隊'))
            home_team_name = escape(choices[1].get('name', '主隊'))
            handicap = escape(str(choices[0].get('hv', '')))
            away_odds = escape(str(choices[0].get('o', 'N/A')))
            home_odds = escape(str(choices[1].get('o', 'N/A')))
            return f"<li><strong>讓分</strong> &nbsp; {away_team_name} ({handicap}) @ {away_odds} | {home_team_name} @ {home_odds}</li>"

    elif market_type == "OU":
        if len(choices) >= 2:
            total_value = escape(str(choices[0].get('v', '')))
            over_odds = escape(str(choices[0].get('o', 'N/A')))
            under_odds = escape(str(choices[1].get('o', 'N/A')))
            return f"<li><strong>大小</strong> &nbsp; ({total_value}) - 大: {over_odds} | 小: {under_odds}</li>"
            
    return ""

def main():
    """Main function to run the analysis and generate index.html."""
    print("Starting odds analysis...")

    all_odds = []
    for sport_name, sport_id in SPORT_ID_MAP.items():
        print(f"- Fetching odds for {sport_name} (ID: {sport_id})")
        odds_url = ODDS_URL_TEMPLATE.format(sport_id=sport_id)
        sport_odds_data = fetch_json_data(odds_url)
        if sport_odds_data:
            all_odds.extend(sport_odds_data)
    
    if not all_odds:
        print("Could not fetch any odds data. Aborting.")
        return

    odds_map = {str(game.get('no')): game for game in all_odds if game.get('no')}
    
    print("Fetching schedule...")
    schedule_data = fetch_json_data(SCHEDULE_URL)
    if not schedule_data or 'list' not in schedule_data:
        print("Could not fetch schedule data. Aborting.")
        return
        
    games_list = schedule_data['list']
    print(f"Found {len(games_list)} games. Starting analysis...")
    
    game_cards_html = []
    for game in games_list:
        game_id = game.get('id')
        if not game_id:
            continue
            
        sport = cgi.escape(game.get('sn', '未知運動'))
        league = cgi.escape(game.get('ln', '未知聯賽'))
        away_team = cgi.escape(game.get('atn', '客隊'))
        home_team = cgi.escape(game.get('htn', '主隊'))
        
        card = '<div class="game-card">'
        card += f'<div class="game-meta">{sport} - {league}</div>'
        card += f'<div class="game-title">{away_team} vs {home_team}</div>'
        card += '<ul class="odds-list">'

        game_odds_data = odds_map.get(str(game_id))
        
        if game_odds_data and 'ms' in game_odds_data:
            markets = game_odds_data['ms']
            market_html_parts = [analyze_market_html(m) for m in markets]
            market_html_parts = [p for p in market_html_parts if p] # Filter out empty strings
            
            if market_html_parts:
                card += "".join(market_html_parts)
            else:
                card += '<li class="status-no-market">暫無可用盤口分析。</li>'
        else:
            card += '<li class="status-no-odds">未找到對應的盤口資料。</li>'
            
        card += '</ul></div>'
        game_cards_html.append(card)

    # Assemble the final HTML
    final_html = HTML_TEMPLATE.format(
        update_time=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        game_cards="".join(game_cards_html)
    )

    # Write to index.html
    report_filename = "index.html"
    try:
        with open(report_filename, 'w', encoding='utf-8') as f:
            f.write(final_html)
        print(f"\nAnalysis complete! Report saved to {os.path.abspath(report_filename)}")
    except IOError as e:
        print(f"Error writing report file: {e}")

if __name__ == "__main__":
    main()
