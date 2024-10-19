import pandas as pd
from pyodide.http import open_url

def main():
    url = "https://raw.githubusercontent.com/taisei1223/create_game/main/onepice_titiles.csv"
    result = pd.read_csv(open_url(url), header=None)
    return result