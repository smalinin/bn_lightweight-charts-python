import asyncio
import html
import json
import os
from typing import Optional
import pandas as pd
from .util import (format_datetime, parse_event_message, js_data, df_data, series_data)
from . import abstract

current_dir = os.path.dirname(os.path.abspath(__file__))

try:
    import wx.html2
except ImportError:
    wx = None

try:
    using_pyside6 = False
    from PyQt5.QtWebEngineWidgets import QWebEngineView
    from PyQt5.QtWebChannel import QWebChannel
    from PyQt5.QtCore import QObject, pyqtSlot as Slot, QUrl, QTimer
except ImportError:
    using_pyside6 = True
    try:
        from PySide6.QtWebEngineWidgets import QWebEngineView
        from PySide6.QtWebChannel import QWebChannel
        from PySide6.QtCore import Qt, QObject, Slot, QUrl, QTimer
    except ImportError:
        try:
            using_pyside6 = False
            from PyQt6.QtWebEngineWidgets import QWebEngineView
            from PyQt6.QtWebChannel import QWebChannel
            from PyQt6.QtCore import QObject, pyqtSlot as Slot, QUrl, QTimer
        except ImportError:
            QWebEngineView = None


if QWebEngineView:
    class Bridge(QObject):
        def __init__(self, chart):
            super().__init__()
            self.win = chart.win

        @Slot(str)
        def callback(self, message):
            emit_callback(self.win, message)

try:
    from streamlit.components.v1 import html as sthtml
except ImportError:
    sthtml = None

try:
    from IPython.display import HTML, display
    import warnings
    warnings.filterwarnings("ignore", category=UserWarning, module="IPython.core.display")
except ImportError:
    HTML = None


def emit_callback(window, string):
    func, args = parse_event_message(window, string)
    asyncio.create_task(func(*args)) if asyncio.iscoroutinefunction(func) else func(*args)


class WxChart(abstract.AbstractChart):
    def __init__(self, parent, inner_width: float = 1.0, inner_height: float = 1.0,
                 scale_candles_only: bool = False, toolbox: bool = False):
        if wx is None:
            raise ModuleNotFoundError('wx.html2 was not found, and must be installed to use WxChart.')
        self.webview: wx.html2.WebView = wx.html2.WebView.New(parent)
        super().__init__(abstract.Window(self.webview.RunScript, 'window.wx_msg.postMessage.bind(window.wx_msg)'),
                         inner_width, inner_height, scale_candles_only, toolbox)

        self.webview.Bind(wx.html2.EVT_WEBVIEW_LOADED, lambda e: wx.CallLater(500, self.win.on_js_load))
        self.webview.Bind(wx.html2.EVT_WEBVIEW_SCRIPT_MESSAGE_RECEIVED, lambda e: emit_callback(self.win, e.GetString()))
        self.webview.AddScriptMessageHandler('wx_msg')

        self.webview.LoadURL("file://"+abstract.INDEX)

    def get_webview(self):
        return self.webview


class QtChart(abstract.AbstractChart):
    def __init__(self, widget=None, inner_width: float = 1.0, inner_height: float = 1.0,
                 scale_candles_only: bool = False, toolbox: bool = False):
        if QWebEngineView is None:
            raise ModuleNotFoundError('QWebEngineView was not found, and must be installed to use QtChart.')
        self.webview = QWebEngineView(widget)
        super().__init__(abstract.Window(self.webview.page().runJavaScript, 'window.pythonObject.callback'),
                         inner_width, inner_height, scale_candles_only, toolbox)

        self.web_channel = QWebChannel()
        self.bridge = Bridge(self)
        self.web_channel.registerObject('bridge', self.bridge)
        self.webview.page().setWebChannel(self.web_channel)
        self.webview.loadFinished.connect(lambda: self.webview.page().runJavaScript('''
            let scriptElement = document.createElement("script")
            scriptElement.src = 'qrc:///qtwebchannel/qwebchannel.js'

            scriptElement.onload = function() {
                var bridge = new QWebChannel(qt.webChannelTransport, function(channel) {
                    var pythonObject = channel.objects.bridge
                    window.pythonObject = pythonObject
                })
            }

            document.head.appendChild(scriptElement)

        '''))
        self.webview.loadFinished.connect(lambda: QTimer.singleShot(200, self.win.on_js_load))
        if using_pyside6:
            self.webview.setContextMenuPolicy(Qt.ContextMenuPolicy.NoContextMenu)
        self.webview.load(QUrl.fromLocalFile(abstract.INDEX))
        self.subcharts.append(self.id)


    def get_webview(self):
        return self.webview


class StaticLWC(abstract.AbstractChart):
    def __init__(self, width=None, height=None, inner_width=1, inner_height=1,
                scale_candles_only: bool = False, toolbox=False, autosize=True, template='index.html'):

        INDEX = os.path.join(current_dir, 'js', template)
        with open(INDEX.replace(template, 'styles.css'), 'r') as f:
            css = f.read()
        with open(INDEX.replace(template, 'bundle.js'), 'r') as f:
            js = f.read()
        with open(INDEX.replace(template, 'lightweight-charts.js'), 'r') as f:
            lwc = f.read()

        with open(INDEX, 'r') as f:
            self._html_init = f.read() \
                .replace('<link rel="stylesheet" href="styles.css">', f"<style>{css}</style>") \
                .replace(' src="./lightweight-charts.js">', f'>{lwc}') \
                .replace(' src="./bundle.js">', f'>{js}') \
                .replace('</body>\n</html>', '<script>\n')
        self._html = ''
        super().__init__(abstract.Window(run_script=self.run_script), inner_width, inner_height,
                        scale_candles_only, toolbox, autosize)
        self.width = width
        self.height = height

    def run_script(self, script, run_last=False):
        if run_last:
            self.win.final_scripts.append(script)
        else:
            self._html += '\n' + script

    def sync_charts(self, sync_crosshairs_only: bool = False):
        if (len(self.subcharts) > 1):
            self._html += '\n'f'''
                Lib.Handler.syncChartsAll
                    ([{', '.join(self.subcharts)}],
                    {'true' if sync_crosshairs_only else 'false'}
                )
            ''' + '\n'

    def load(self):
        if self.win.loaded:
            return
        self.win.loaded = True
        for script in self.win.final_scripts:
            self._html += '\n' + script + '\n'
        self._load()

    def _load(self): pass


class StreamlitChart(StaticLWC):
    def __init__(self, width=None, height=None, inner_width=1, inner_height=1, scale_candles_only: bool = False, toolbox: bool = False):
        super().__init__(width, height, inner_width, inner_height, scale_candles_only, toolbox)

    def _load(self):
        if sthtml is None:
            raise ModuleNotFoundError('streamlit.components.v1.html was not found, and must be installed to use StreamlitChart.')
        sthtml(f'{self._html_init}  (async ()=> {{\n{self._html}\n}})();\n </script></body></html>', width=self.width, height=self.height)


class JupyterChart(StaticLWC):
    def __init__(self, width: int = 800, height=350, inner_width=1, inner_height=1, scale_candles_only: bool = False, toolbox: bool = False):
        super().__init__(width, height, inner_width, inner_height, scale_candles_only, toolbox, True)


    def _load(self):
        if HTML is None:
            raise ModuleNotFoundError('IPython.display.HTML was not found, and must be installed to use JupyterChart.')
        html_code = html.escape(f"{self._html_init}  (async ()=> {{\n{self._html}\n}})();\n </script></body></html>")
        iframe = f'<iframe width="{self.width}" height="{self.height}" frameBorder="0" srcdoc="{html_code}"></iframe>'
        display(HTML(iframe))


class HTMLChart(StaticLWC):
    def __init__(self, width: int = 800, height=350, inner_width=1, inner_height=1,
                scale_candles_only: bool = False, toolbox: bool = False, filename = "charts.html"):
        super().__init__(width, height, inner_width, inner_height, scale_candles_only, toolbox, True)
        self.filename = filename

    def _load(self):
        html_code = f"{self._html_init}  (async ()=> {{\n {self._html}\n}})();\n </script></body></html>"
        with open(self.filename, 'w') as file:
            file.write(html_code)


class HTMLChart_BN(StaticLWC):
    def __init__(self, width: int = 800, height=350, inner_width=1, inner_height=1,
                scale_candles_only: bool = False, toolbox: bool = False, filename = "bn_charts.html"):
        super().__init__(width=width, height=height, inner_width=inner_width, inner_height=inner_height,
                        scale_candles_only=scale_candles_only, toolbox=toolbox, autosize=True,
                        template='index_bn.html')
        self.js_win = []
        self.names = []
        self.trades = []
        self.performance = []
        self.strat_titles = []
        self.filename = filename

    def _prepare_html(self):
        func_code = ""
        for i in range(len(self.js_win)):
            func_code += f'''
            if (id=={i}) {{
                document.querySelector('#container').innerHTML = ''
                {self.js_win[i]}
                updateTrades(id);
                updatePerformance(id);
            }}
            '''
        html_code = f'''{self._html_init}

        let html = []
        const stocks = {json.dumps(self.names)};
        const trades = {json.dumps(self.trades)};
        const perf_metrics = {json.dumps(self.performance)};
        const strategy_titles = {json.dumps(self.strat_titles)};

        async function updateChart(id){{
            document.querySelector('#nav-home-tab')?.click();
            {func_code}
        }}

        function updateTrades(id){{
            document.querySelector('#trades-title').innerText = stocks[id];
            const tbl = document.querySelector('#trades tbody');
            tbl.innerHTML = '';
            const lst = trades[id];
            if (lst.length == 0)
                return;
            let state = 0;
            let _html = '';
            for (const v of lst) {{
                if (v.type===0) {{
                    if (state!==0) {{
                        _html += `</tbody></table></td></tr>`;
                        state = 0;
                    }}
                    const pos = v.size > 0 ? 'Long' : 'Short';
                    _html += `<tr><td>${{v.ref}}</td> <td>${{pos}}</td><td>${{v.tradeid}}</td>`
                                +`<td class="dt0">${{v.dateopen}}</td><td>${{v.priceopen}}</td>`
                                +`<td class="dt1">${{v.dateclose}}</td><td>${{v.priceclose}}</td>`
                                +`<td>${{v.pnlcomm}}</td><td>${{v.return_pct}}</td><td>${{v.commission}}</td>`
                                +`<td>${{v.barlen}}</td></tr>`;
                }}
                else {{
                    if (state===0) {{
                        _html += `<tr><td></td><td></td><td colspan="9" class="separator">`
                                +`<table class="table table-sm table-striped table-bordered table-hover">`
                                +`<thead class="table-dark">`
                                +`<th>Ref</th><th>Date</th><th>Type</th><th>Price</th><th>Size</th></thead>`
                                +`<tbody>`;
                        state = 1;
                    }}
                    const pos = v.o_ordtype===0 ? 'Buy' : 'Sell';
                    _html += `<tr><td>${{v.o_ref}}</td><td class="dt">${{v.o_datetime}}</td><td>${{pos}}</td>`
                            +`<td>${{v.o_price}}</td><td>${{v.o_size}}</td></tr>`;
                }}
            }}
            tbl.innerHTML = _html;
        }}

        function updatePerformance(id){{
            document.querySelector('#strategy-title').innerText = strategy_titles[id];
            const tbl = document.querySelector('#performance tbody');
            tbl.innerHTML = '';
            const lst = perf_metrics[id];
            if (lst.length == 0)
                return;
            for (const v of lst) {{
                tbl.innerHTML += `<tr><td>${{v.index}}</td><td style="text-align:right">${{v.value}}</td></tr>`;
            }}
        }}

        let id=0;
        for(const v of stocks) {{
            html.push(`<a href="#" class="list-group-item list-group-item-action py-2" datas=${{id++}}>`
                +`  <div class="d-flex w-100">`
                +`    <strong class="mb-1">${{v}}</strong>`
                +`  </div>`
                +`</a>`);
        }}

        document.querySelector('#slist').innerHTML = html.join('\\n');
        document.querySelector('#slist').onclick = (e) => {{
            const item = e.target.closest('a');
            const item_datas = item.getAttribute('datas');
            if (item_datas) {{
                updateChart(parseInt(item_datas));
                for (const v of document.querySelectorAll('#slist a'))
                    v.classList.remove('active')
                item.classList.add('active')
            }}
        }}
        document.querySelectorAll('#slist a')[0]?.click()

        document.querySelector('#trades tbody').ondblclick = (e) => {{
            const n = e.target;
            const chart = {self.id}.chart;
            if (n.nodeName==='TD' && n.classList.contains('dt0')) {{
                const dt0 = n.innerText
                const dt1 = n.parentNode.querySelector('td.dt1')?.innerText
                scrollToTime(chart, dt0, dt1)
            }}
            else if (n.nodeName==='TD' && n.classList.contains('dt1')) {{
                const dt1 = n.innerText
                const dt0 = n.parentNode.querySelector('td.dt0')?.innerText
                scrollToTime(chart, dt0, dt1)
            }}
            else if (n.nodeName==='TD' && n.classList.contains('dt')) {{
                const dt0 = n.innerText
                scrollToTime(chart, dt0)
            }}
        }}
        \n</script></body></html>
        '''
        return html_code

    def _load(self):
        html_code = self._prepare_html()
        with open(self.filename, 'w') as file:
            file.write(html_code)

    def new_window(self):
        self.js_win.append(self._html)
        self._html = self._html_chart_init
        self.subcharts = [self.id]
        self._lines = []
        self._clear_marker_list()

    def set_name(self, name):
        self.names.append(name)

    def set_trades(self, lst:list):
        self.trades.append(lst)

    def set_performance_metrics(self, df:Optional[pd.Series] = None, strat_title: Optional[str] = ''):
        v = []
        if df is not None and not df.empty:
            v = series_data(df)
        self.performance.append(v)
        self.strat_titles.append(strat_title)


