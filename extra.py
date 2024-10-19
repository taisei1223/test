def main():
    url = "https://raw.githubusercontent.com/taisei1223/create_game/main/onepice_titiles.csv"
    df = pd.read_csv(open_url(url), header=None)
    return df