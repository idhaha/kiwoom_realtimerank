import re
import json
import requests
import argparse
from datetime import datetime
import pandas as pd
import matplotlib.pyplot as plt

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


def fetch_html(url, timeout=15):
    headers = {"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"}
    r = requests.get(url, headers=headers, timeout=timeout)
    r.raise_for_status()
    return r.text


def extract_highcharts_data(html):
    # Try to find Highcharts `data: [[ts, val], ...]` blocks
    patterns = [r"data\s*:\s*(\[\s*\[.*?\]\s*\])",
                r"series\s*:\s*\[\s*\{[\s\S]*?data\s*:\s*(\[\s*\[.*?\]\s*\])[\s\S]*?\}\s*\]",
                r"\"data\"\s*:\s*(\[\s*\[.*?\]\s*\])"]

    for pat in patterns:
        m = re.search(pat, html, flags=re.DOTALL)
        if m:
            arr_text = m.group(1)
            # Clean common JS bits
            arr_text = re.sub(r"//.*", "", arr_text)
            arr_text = arr_text.replace("null", "null")
            try:
                data = json.loads(arr_text)
                # Expect list of [ts, val]
                if isinstance(data, list) and len(data) and isinstance(data[0], list):
                    return [(datetime.utcfromtimestamp(int(item[0]) / 1000) if isinstance(item[0], (int, float)) else parse_date_str(item[0]), float(item[1]) if item[1] is not None else None) for item in data if item and len(item) >= 2]
            except Exception:
                # Fallback: try to parse numbers using regex
                pairs = re.findall(r"\[\s*(\d+)\s*,\s*([\-\d\.null]+)\s*\]", arr_text)
                if pairs:
                    parsed = []
                    for ts_s, val_s in pairs:
                        try:
                            ts = datetime.utcfromtimestamp(int(ts_s) / 1000)
                            val = None if val_s == 'null' else float(val_s)
                            parsed.append((ts, val))
                        except Exception:
                            continue
                    if parsed:
                        return parsed

    return None


def extract_json_objects(html):
    # Try to extract arrays of objects like [{"Date":"2025-01-01","Value":0.1}, ...]
    m = re.search(r"(\[\s*\{\s*\"?Date\"?[\s\S]*?\}\s*\])", html)
    if not m:
        m = re.search(r"(\[\s*\{[\s\S]*?\}\s*\])", html)
    if m:
        txt = m.group(1)
        # Attempt to convert single quotes to double quotes and remove trailing commas
        txt2 = re.sub(r"\,(\s*[\]\}])", r"\1", txt)
        try:
            data = json.loads(txt2)
            rows = []
            for obj in data:
                if isinstance(obj, dict):
                    # find date-like field and a numeric value
                    date_keys = [k for k in obj.keys() if k.lower() in ('date', 'datetime', 'time')]
                    val_keys = [k for k in obj.keys() if k.lower() in ('value', 'close', 'actual', 'latestvalue')]
                    if date_keys and val_keys:
                        d = parse_date_str(obj[date_keys[0]])
                        v = obj[val_keys[0]]
                        rows.append((d, float(v) if v is not None else None))
            if rows:
                return rows
        except Exception:
            return None
    return None


def parse_date_str(s):
    if s is None:
        return None
    if isinstance(s, (int, float)):
        return datetime.utcfromtimestamp(int(s))
    s = str(s)
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(s, fmt)
        except Exception:
            continue
    # Last resort: try pandas
    try:
        return pd.to_datetime(s)
    except Exception:
        return None


def build_dataframe(pairs):
    df = pd.DataFrame(pairs, columns=['date', 'value'])
    df = df.dropna(subset=['date'])
    df['date'] = pd.to_datetime(df['date'])
    df = df.set_index('date').sort_index()
    return df


def plot_df(df, out_file=None, title="Japan 2Y Note Yield"):
    plt.style.use('seaborn-darkgrid')
    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(df.index, df['value'], marker='.', linewidth=1)
    ax.set_title(title)
    ax.set_ylabel('Yield')
    fig.autofmt_xdate()
    if out_file:
        fig.savefig(out_file, bbox_inches='tight', dpi=150)
        print(f"Saved plot to {out_file}")
    else:
        plt.show()


def main():
    parser = argparse.ArgumentParser(description='Fetch and plot Japan 2Y yield from TradingEconomics page')
    parser.add_argument('--url', default='https://tradingeconomics.com/japan/2-year-note-yield', help='TradingEconomics page URL')
    parser.add_argument('--out', default='japan_2y_yield.png', help='Output PNG file (optional)')
    parser.add_argument('--show', action='store_true', help='Show plot interactively instead of saving')
    args = parser.parse_args()

    print(f"Fetching: {args.url}")
    html = fetch_html(args.url)

    pairs = extract_highcharts_data(html)
    if not pairs:
        pairs = extract_json_objects(html)

    if not pairs:
        print("Failed to locate series data in page HTML. The page may require a JS-rendered request or API key.")
        return

    df = build_dataframe(pairs)
    if df.empty:
        print("Parsed data is empty after conversion.")
        return

    if args.show:
        plot_df(df, out_file=None, title='Japan 2Y Note Yield')
    else:
        plot_df(df, out_file=args.out, title='Japan 2Y Note Yield')


if __name__ == '__main__':
    main()
