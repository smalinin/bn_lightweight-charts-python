<div align="center">

# bn-lightweight-charts-python

[![PyPi Release](https://img.shields.io/pypi/v/bn-lightweight-charts?color=32a852&label=PyPi)](https://pypi.org/project/bn_lightweight-charts/)
[![Total downloads](https://img.shields.io/pepy/dt/bn-lightweight-charts?label=%E2%88%91&color=skyblue)](https://pypistats.org/packages/backtrader_next)
[![Made with Python](https://img.shields.io/badge/Python-3.8+-c7a002?logo=python&logoColor=white)](https://python.org "Go to Python homepage")
[![License](https://img.shields.io/github/license/smalinin/bn_lightweight-charts-python?color=9c2400)](https://github.com/smalinin/bn_lightweight-charts-python/blob/main/LICENSE)
[![Documentation](https://img.shields.io/badge/documentation-006ee3)](https://lightweight-charts-python.readthedocs.io/en/latest/index.html)

lightweight-charts-python aims to provide a simple and pythonic way to access and implement [TradingView's Lightweight Charts](https://www.tradingview.com/lightweight-charts/).

</div>

## Installation
```
pip install bn-lightweight-charts
```
## History
Package is based on [lightweight-charts-python](https://github.com/louisnw01/lightweight-charts-python)
Changes:

 - used lightweight-charts js v:5.x
 - added milti-pane support from lightweight-charts js v:5.x
 - added support for charts resize and panel resize
 - fixed issue with sync charts
 - added support view in browser


## Features
1. Streamlined for live data, with methods for updating directly from tick data.
2. Multi-pane charts using [Subcharts](https://lightweight-charts-python.readthedocs.io/en/latest/reference/abstract_chart.html#AbstractChart.create_subchart).
3. The [Toolbox](https://lightweight-charts-python.readthedocs.io/en/latest/reference/toolbox.html), allowing for trendlines, rectangles, rays and horizontal lines to be drawn directly onto charts.
4. [Events](https://lightweight-charts-python.readthedocs.io/en/latest/tutorials/events.html) allowing for timeframe selectors (1min, 5min, 30min etc.), searching, hotkeys, and more.
5. [Tables](https://lightweight-charts-python.readthedocs.io/en/latest/reference/tables.html) for watchlists, order entry, and trade management.
6. Direct integration of market data through [Polygon.io's](https://polygon.io/?utm_source=affiliate&utm_campaign=pythonlwcharts) market data API.

__Supports:__ Jupyter Notebooks, PyQt6, PyQt5, PySide6, wxPython, Streamlit, and asyncio.

PartTimeLarry: [Interactive Brokers API and TradingView Charts in Python](https://www.youtube.com/watch?v=TlhDI3PforA)
___

## Samples
### 0. Multi-pane support
```
import pandas as pd
import webbrowser
from bn_lightweight_charts import HTMLChart

def calculate_sma(df, period: int = 50, name = None):
    name = name or f'SMA {period}'
    return pd.DataFrame({
        'time': df['date'],
        name: df['close'].rolling(window=period).mean()
    }) #.dropna()

def demo():
    chart = HTMLChart(width=1200, height=800, inner_height=-500, filename='charts.html')
    chart.legend(visible=True)
    df = pd.read_csv('./PDATA/4ohlcv.csv')
    chart.set(df)

    # Pane 0
    line7 = chart.create_line('SMA 7', color='red', price_line=False, price_label=False)
    sma7_data = calculate_sma(df, period=7)
    line7.set(sma7_data)
    line14 = chart.create_line('SMA 14', color='blue', price_line=False, price_label=False)
    sma14_data = calculate_sma(df, period=14)
    line14.set(sma14_data)

    # Pane 1
    sma20_data = calculate_sma(df, period=20, name='Hist SMA(20)')
    line20 = chart.create_histogram('Hist SMA(20)', price_line=False, price_label=False, pane_index=1)
    line20.set(sma20_data)

    # Pane 2
    sma50_data = calculate_sma(df, period=50)
    line50 = chart.create_line('SMA 50', color='green', price_line=False, price_label=False, pane_index=2)
    line50.set(sma50_data)

    chart.load()
    webbrowser.open(chart.filename)

if __name__ == '__main__':
    demo()
```
![cover gif](https://raw.githubusercontent.com/smalinin/bn_lightweight-charts-python/main/cover.gif?raw=true)



### 1. Display data from a csv:

```python
import pandas as pd
from bn_lightweight_charts import Chart


if __name__ == '__main__':
    
    chart = Chart()
    
    # Columns: time | open | high | low | close | volume 
    df = pd.read_csv('ohlcv.csv')
    chart.set(df)
    
    chart.show(block=True)

```
![setting_data image](https://raw.githubusercontent.com/smalinin/bn_lightweight-charts-python/main/examples/1_setting_data/setting_data.png)
___

### 2. Updating bars in real-time:

```python
import pandas as pd
from time import sleep
from bn_lightweight_charts import Chart

if __name__ == '__main__':

    chart = Chart()

    df1 = pd.read_csv('ohlcv.csv')
    df2 = pd.read_csv('next_ohlcv.csv')

    chart.set(df1)

    chart.show()

    last_close = df1.iloc[-1]['close']
    
    for i, series in df2.iterrows():
        chart.update(series)

        if series['close'] > 20 and last_close < 20:
            chart.marker(text='The price crossed $20!')
            
        last_close = series['close']
        sleep(0.1)

```

![live data gif](https://github.com/smalinin/bn_lightweight-charts-python/blob/main/examples/2_live_data/live_data.gif?raw=true)
___

### 3. Updating bars from tick data in real-time:

```python
import pandas as pd
from time import sleep
from bn_lightweight_charts import Chart


if __name__ == '__main__':
    
    df1 = pd.read_csv('ohlc.csv')
    
    # Columns: time | price 
    df2 = pd.read_csv('ticks.csv')
    
    chart = Chart()
    
    chart.set(df1)
    
    chart.show()
    
    for i, tick in df2.iterrows():
        chart.update_from_tick(tick)
            
        sleep(0.03)

```
![tick data gif](https://raw.githubusercontent.com/smalinin/bn_lightweight-charts-python/main/examples/3_tick_data/tick_data.gif)
___

### 4. Line Indicators:

```python
import pandas as pd
from bn_lightweight_charts import Chart


def calculate_sma(df, period: int = 50):
    return pd.DataFrame({
        'time': df['date'],
        f'SMA {period}': df['close'].rolling(window=period).mean()
    }).dropna()


if __name__ == '__main__':
    chart = Chart()
    chart.legend(visible=True)

    df = pd.read_csv('ohlcv.csv')
    chart.set(df)

    line = chart.create_line('SMA 50')
    sma_data = calculate_sma(df, period=50)
    line.set(sma_data)

    chart.show(block=True)

```
![line indicators image](https://raw.githubusercontent.com/smalinin/bn_lightweight-charts-python/main/examples/4_line_indicators/line_indicators.png)
___

### 5. Styling:

```python
import pandas as pd
from bn_lightweight_charts import Chart


if __name__ == '__main__':
    
    chart = Chart()

    df = pd.read_csv('ohlcv.csv')

    chart.layout(background_color='#090008', text_color='#FFFFFF', font_size=16,
                 font_family='Helvetica')

    chart.candle_style(up_color='#00ff55', down_color='#ed4807',
                       border_up_color='#FFFFFF', border_down_color='#FFFFFF',
                       wick_up_color='#FFFFFF', wick_down_color='#FFFFFF')

    chart.volume_config(up_color='#00ff55', down_color='#ed4807')

    chart.watermark('1D', color='rgba(180, 180, 240, 0.7)')

    chart.crosshair(mode='normal', vert_color='#FFFFFF', vert_style='dotted',
                    horz_color='#FFFFFF', horz_style='dotted')

    chart.legend(visible=True, font_size=14)

    chart.set(df)

    chart.show(block=True)

```
![styling image](https://raw.githubusercontent.com/smalinin/bn_lightweight-charts-python/main/examples/5_styling/styling.png)
___

### 6. Callbacks:

```python
import pandas as pd
from bn_lightweight_charts import Chart


def get_bar_data(symbol, timeframe):
    if symbol not in ('AAPL', 'GOOGL', 'TSLA'):
        print(f'No data for "{symbol}"')
        return pd.DataFrame()
    return pd.read_csv(f'bar_data/{symbol}_{timeframe}.csv')


def on_search(chart, searched_string):  # Called when the user searches.
    new_data = get_bar_data(searched_string, chart.topbar['timeframe'].value)
    if new_data.empty:
        return
    chart.topbar['symbol'].set(searched_string)
    chart.set(new_data)


def on_timeframe_selection(chart):  # Called when the user changes the timeframe.
    new_data = get_bar_data(chart.topbar['symbol'].value, chart.topbar['timeframe'].value)
    if new_data.empty:
        return
    chart.set(new_data, True)


def on_horizontal_line_move(chart, line):
    print(f'Horizontal line moved to: {line.price}')


if __name__ == '__main__':
    chart = Chart(toolbox=True)
    chart.legend(True)

    chart.events.search += on_search

    chart.topbar.textbox('symbol', 'TSLA')
    chart.topbar.switcher('timeframe', ('1min', '5min', '30min'), default='5min',
                          func=on_timeframe_selection)

    df = get_bar_data('TSLA', '5min')
    chart.set(df)

    chart.horizontal_line(200, func=on_horizontal_line_move)

    chart.show(block=True)

```
![callbacks gif](https://raw.githubusercontent.com/smalinin/bn_lightweight-charts-python/main/examples/6_callbacks/callbacks.gif)
___

<div align="center">
_This package is an independent creation and has not been endorsed, sponsored, or approved by TradingView. The author of this package does not have any official relationship with TradingView, and the package does not represent the views or opinions of TradingView._
</div>
