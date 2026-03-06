import urllib.request
import json
import os
from datetime import datetime

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
    """Fetches JSON data from a given URL using urllib and handles potential errors."""
    try:
        # Add a user-agent header to mimic a browser
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'}
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response:
            if response.status != 200:
                print(f"Error: Received status code {response.status} from {url}")
                return None
            # Read and decode the response
            data = response.read().decode('utf-8')
            return json.loads(data)
    except Exception as e:
        print(f"Error fetching data from {url}: {e}")
        return None

def find_game_odds(game_id, all_odds_data):
    """Finds the odds for a specific game ID from the aggregated odds data."""
    for sport_data in all_odds_data:
        for game_data in sport_data.get('ms', []):
             # The game ID from schedule seems to be in 'no' field of the odds data
            if str(game_data.get('no')) == str(game_id):
                return game_data
    return None

def analyze_market(market):
    """Analyzes a single market (ML, HDC, OU) and returns a formatted string."""
    market_type = market.get('v')
    choices = market.get('cs', [])
    
    if not choices:
        return ""

    if market_type == "ML": # 不讓分
        if len(choices) >= 2:
            away_odds = choices[0].get('o', 'N/A')
            home_odds = choices[1].get('o', 'N/A')
            return f"不讓分 (客: {away_odds}, 主: {home_odds})"
        
    elif market_type == "HDC": # 讓分
        if len(choices) >= 2:
            away_team_name = choices[0].get('name', '客隊')
            home_team_name = choices[1].get('name', '主隊')
            handicap = choices[0].get('hv', '')
            away_odds = choices[0].get('o', 'N/A')
            home_odds = choices[1].get('o', 'N/A')
            return f"讓分 ({away_team_name} {handicap} @ {away_odds}, {home_team_name} @ {home_odds})"

    elif market_type == "OU": # 大小
        if len(choices) >= 2:
            total_value = choices[0].get('v', '')
            over_odds = choices[0].get('o', 'N/A')
            under_odds = choices[1].get('o', 'N/A')
            return f"大小 ({total_value} - 大: {over_odds}, 小: {under_odds})"
            
    return ""


def main():
    """Main function to run the analysis."""
    print("開始抓取運彩盤口資料...")

    # 1. Fetch all available odds data first
    all_odds = []
    print("正在獲取所有運動的盤口資料...")
    for sport_name, sport_id in SPORT_ID_MAP.items():
        print(f"- 正在抓取 {sport_name} (ID: {sport_id})")
        odds_url = ODDS_URL_TEMPLATE.format(sport_id=sport_id)
        sport_odds_data = fetch_json_data(odds_url)
        if sport_odds_data:
            all_odds.extend(sport_odds_data)
    
    if not all_odds:
        print("無法獲取任何盤口資料，程式中止。")
        return

    # Create a lookup dictionary for faster access
    odds_map = {str(game.get('no')): game for game in all_odds if game.get('no')}
    
    print("\n盤口資料抓取完畢，開始獲取賽程...")
    schedule_data = fetch_json_data(SCHEDULE_URL)
    if not schedule_data or 'list' not in schedule_data:
        print("無法獲取賽程資料，程式中止。")
        return
        
    games_list = schedule_data['list']
    print(f"成功獲取 {len(games_list)} 場賽事，開始進行分析...")
    
    report_lines = [
        f"# 台灣運彩盤口分析報告",
        f"報告生成時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "---"
    ]

    # 2. Iterate through the schedule and find matching odds using the map
    for game in games_list:
        game_id = game.get('id')
        if not game_id:
            continue
            
        sport = game.get('sn', '未知運動')
        league = game.get('ln', '未知聯賽')
        away_team = game.get('atn', '客隊')
        home_team = game.get('htn', '主隊')
        
        game_title = f"### {sport} - {league}: {away_team} vs {home_team}"
        report_lines.append(game_title)

        # Efficiently find the game's odds data from the map
        game_odds_data = odds_map.get(str(game_id))
        
        if game_odds_data and 'ms' in game_odds_data:
            markets = game_odds_data['ms']
            conclusions = []
            for market in markets:
                analysis = analyze_market(market)
                if analysis:
                    conclusions.append(f"- {analysis}")
            
            if conclusions:
                report_lines.extend(conclusions)
            else:
                report_lines.append("- 暫無可用盤口分析。")
        else:
            report_lines.append("- 未找到對應的盤口資料。")
            
        report_lines.append("") # Add a blank line for spacing

    # Write report to file
    report_filename = "odds_analysis_report.md"
    try:
        with open(report_filename, 'w', encoding='utf-8') as f:
            f.write("\n".join(report_lines))
        print(f"\n分析完成！報告已儲存至 {os.path.abspath(report_filename)}")
    except IOError as e:
        print(f"寫入報告檔案時發生錯誤: {e}")


if __name__ == "__main__":
    main()
