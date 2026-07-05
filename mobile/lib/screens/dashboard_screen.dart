import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'login_screen.dart';
import 'portfolio_screen.dart';
import '../utils/formatters.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  static const appBg = Color(0xFF020617);
  static const panel = Color(0xFF111827);
  static const panelSoft = Color(0xFF1F2937);
  static const border = Color(0xFF334155);
  static const accent = Color(0xFFFB923C);
  static const muted = Color(0xFF94A3B8);
  static const green = Color(0xFF22C55E);
  static const red = Color(0xFFEF4444);
  final marketSymbols = const ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'BTC-USD'];

  final allocation = const [
    ('Stocks', 60.0, green),
    ('ETF', 20.0, Color(0xFF38BDF8)),
    ('Crypto', 15.0, accent),
    ('Cash', 5.0, muted),
  ];

  List portfolios = [];
  List watchlists = [];
  List goals = [];
  Map<String, Map<String, dynamic>?> market = {};
  List<Map<String, dynamic>> allTransactions = [];
  bool loading = true;
  int tabIndex = 0;
  String error = '';

  @override
  void initState() {
    super.initState();
    loadData();
  }

  Future<void> loadData() async {
    try {
      final results = await Future.wait([
        ApiService.getPortfolios(),
        ApiService.getWatchlists(),
        ApiService.getGoals(),
      ]);
      final portfolioData = results[0];
      final txResults = await Future.wait(
        portfolioData.map((portfolio) => ApiService.getTransactions(portfolio['id'])),
      );
      final txList = txResults.expand((items) => items).cast<Map<String, dynamic>>().toList();
      final quotes = <String, Map<String, dynamic>?>{};
      for (final symbol in marketSymbols) {
        quotes[symbol] = await ApiService.getStockPrice(symbol);
      }
      if (!mounted) return;
      setState(() {
        portfolios = results[0];
        watchlists = results[1];
        goals = results[2];
        allTransactions = txList;
        market = quotes;
        error = '';
        loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        error = e.toString();
        loading = false;
      });
    }
  }

  Future<void> logout() async {
    await ApiService.clearToken();
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tabs = [
      _TabSpec('Dashboard', Icons.bar_chart_rounded),
      _TabSpec('Watchlist', Icons.visibility_outlined),
      _TabSpec('Goals', Icons.track_changes_rounded),
      _TabSpec('News', Icons.article_outlined),
      _TabSpec('Market', Icons.trending_up_rounded),
      _TabSpec('AI', Icons.smart_toy_outlined),
    ];

    return Scaffold(
      backgroundColor: appBg,
      appBar: AppBar(
        backgroundColor: panel,
        surfaceTintColor: panel,
        title: Text(
          tabs[tabIndex].label,
          style:
              const TextStyle(color: Colors.white, fontWeight: FontWeight.w900),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: muted),
            onPressed: logout,
            tooltip: 'Đăng xuất',
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator(color: accent))
          : RefreshIndicator(
              color: accent,
              backgroundColor: panel,
              onRefresh: loadData,
              child: _buildTab(),
            ),
      bottomNavigationBar: _BottomTabs(
        tabs: tabs,
        currentIndex: tabIndex,
        onTap: (index) => setState(() => tabIndex = index),
      ),
    );
  }

  Widget _buildTab() {
    if (error.isNotEmpty) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _messageCard(
              'Không tải được dữ liệu', error, Icons.warning_amber_rounded)
        ],
      );
    }
    return switch (tabIndex) {
      0 => _dashboardTab(),
      1 => _watchlistTab(),
      2 => _goalsTab(),
      3 => _newsTab(),
      4 => _marketTab(),
      5 => _aiTab(),
      _ => _dashboardTab(),
    };
  }

  Widget _dashboardTab() {
    final holdings = _buildHoldings();
    final totalCost = holdings.fold<double>(0, (sum, item) => sum + (item['cost'] as double));
    final totalValue = holdings.fold<double>(0, (sum, item) => sum + (item['value'] as double));
    final totalPnl = totalValue - totalCost;
    final weightedToday = totalValue > 0
        ? holdings.fold<double>(
            0,
            (sum, item) => sum + ((item['changePercent'] as double) * (item['value'] as double)),
          ) /
            totalValue
        : 0;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      children: [
        Row(
          children: [
            _statCard('Portfolio Value', formatCompactCurrency(totalValue),
                Icons.account_balance_wallet_outlined),
            const SizedBox(width: 10),
            _statCard('Today P/L', formatSignedCurrency(totalPnl), Icons.trending_up_rounded,
                valueColor: totalPnl >= 0 ? green : red),
            const SizedBox(width: 10),
            _statCard('Today Move', formatSignedPercent(weightedToday), Icons.show_chart_rounded,
                valueColor: weightedToday >= 0 ? green : red),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            _quickAction('Buy', Icons.add_shopping_cart_rounded),
            const SizedBox(width: 8),
            _quickAction('Sell', Icons.sell_rounded),
            const SizedBox(width: 8),
            _quickAction('Add Asset', Icons.add_chart_rounded),
            const SizedBox(width: 8),
            _quickAction('Deposit', Icons.payments_rounded),
          ],
        ),
        const SizedBox(height: 18),
        _performanceChart(),
        const SizedBox(height: 18),
        _sectionTitle('Portfolios', Icons.bar_chart_rounded),
        const SizedBox(height: 10),
        _holdingsCard(holdings),
        const SizedBox(height: 12),
        if (portfolios.isEmpty) _emptyCard('Chưa có portfolio nào'),
        ...portfolios.map((p) => _portfolioCard(p)),
        const SizedBox(height: 18),
        _allocationCard(),
        const SizedBox(height: 18),
        _riskMetricsCard(),
        const SizedBox(height: 18),
        _sectionTitle('Market pulse', Icons.trending_up_rounded),
        const SizedBox(height: 10),
        _marketMoversCard(),
      ],
    );
  }

  Widget _watchlistTab() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      children: [
        _sectionTitle('Watchlist', Icons.visibility_outlined),
        const SizedBox(height: 10),
        _watchlistInsight('NVDA', '\$1,240', '+4.2%', 'AI Score 88', true),
        _watchlistInsight('AMD', '\$176', '+2.6%', 'AI Score 81', true),
        _watchlistInsight('AAPL', '\$214', '-1.1%', 'AI Score 64', false),
      ],
    );
  }

  Widget _goalsTab() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      children: [
        _sectionTitle('Goals', Icons.track_changes_rounded),
        const SizedBox(height: 10),
        if (goals.isEmpty) _emptyCard('Chưa có mục tiêu nào'),
        ...goals.map((g) => _goalCard(g)),
      ],
    );
  }

  Widget _newsTab() {
    final headlines = [
      ('NVDA Earnings Beat', 'Bullish · High Impact'),
      ('Fed Holds Rates', 'Neutral · Medium Impact'),
      ('Apple China Sales Slow', 'Bearish · High Impact'),
    ];
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      children: [
        _sectionTitle('News', Icons.article_outlined),
        const SizedBox(height: 10),
        ...headlines.map((item) => _plainCard(item.$1, item.$2)),
      ],
    );
  }

  Widget _marketTab() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      children: [
        _sectionTitle('Market', Icons.trending_up_rounded),
        const SizedBox(height: 10),
        _marketMoversCard(),
        const SizedBox(height: 16),
        _sectionTitle('Live prices', Icons.query_stats_rounded),
        const SizedBox(height: 10),
        ...marketSymbols.map((symbol) => _marketRow(symbol)),
      ],
    );
  }

  Widget _aiTab() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      children: [
        _sectionTitle('AI Analysis', Icons.smart_toy_outlined),
        const SizedBox(height: 10),
        _messageCard(
          'Risk Score: 72',
          'Diversification: Good · Concentration Risk: High',
          Icons.auto_awesome_rounded,
        ),
        const SizedBox(height: 12),
        _messageCard(
          'Suggested Rebalance',
          'Trim NVDA by 4%, add broad ETF exposure, keep cash near 5%.',
          Icons.balance_rounded,
        ),
      ],
    );
  }

  Widget _statCard(String label, String value, IconData icon,
      {Color valueColor = Colors.white}) {
    return Expanded(
      child: Container(
        height: 104,
        padding: const EdgeInsets.all(14),
        decoration: _panelDecoration(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: accent, size: 20),
            const Spacer(),
            Text(value,
                style: TextStyle(
                    color: valueColor,
                    fontSize: 24,
                    fontWeight: FontWeight.w900)),
            const SizedBox(height: 2),
            Text(label,
                style: const TextStyle(
                    color: muted, fontSize: 12, fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }

  Widget _quickAction(String label, IconData icon) => Expanded(
        child: Container(
          height: 62,
          decoration: _panelDecoration(),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: accent, size: 20),
              const SizedBox(height: 5),
              FittedBox(
                fit: BoxFit.scaleDown,
                child: Text(label,
                    maxLines: 1,
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w900)),
              ),
            ],
          ),
        ),
      );

  Widget _performanceChart() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _panelDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text('Performance',
                    style: TextStyle(
                        color: Colors.white, fontWeight: FontWeight.w900)),
              ),
              for (final r in ['1D', '1W', '1M', '1Y', 'ALL'])
                Container(
                  margin: const EdgeInsets.only(left: 5),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                  decoration: BoxDecoration(
                    color: r == '1M' ? accent : panelSoft,
                    borderRadius: BorderRadius.circular(7),
                  ),
                  child: Text(r,
                      style: TextStyle(
                          color: r == '1M' ? appBg : muted,
                          fontSize: 10,
                          fontWeight: FontWeight.w900)),
                ),
            ],
          ),
          const SizedBox(height: 14),
          SizedBox(
            height: 130,
            child: CustomPaint(
              painter: _PerformancePainter(
                const [0.34, 0.42, 0.38, 0.55, 0.50, 0.67, 0.72, 0.88],
              ),
              child: const SizedBox.expand(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _holdingsCard(List<Map<String, dynamic>> holdings) => Container(
        padding: const EdgeInsets.all(16),
        decoration: _panelDecoration(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Top Holdings',
                style: TextStyle(
                    color: Colors.white, fontWeight: FontWeight.w900)),
            const SizedBox(height: 12),
            if (holdings.isEmpty)
              const Text('Chưa có vị thế đang nắm giữ', style: TextStyle(color: muted, fontSize: 12))
            else
              for (final h in holdings.take(5))
                _weightRow(
                  h['symbol'] as String,
                  '${formatCompactCurrency(h['value'] as double)} · ${formatSignedPercent(h['changePercent'] as double)}',
                  h['weight'] as double,
                  (h['changePercent'] as double) >= 0 ? green : accent,
                ),
          ],
        ),
      );

  Widget _allocationCard() => Container(
        padding: const EdgeInsets.all(16),
        decoration: _panelDecoration(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Asset Allocation',
                style: TextStyle(
                    color: Colors.white, fontWeight: FontWeight.w900)),
            const SizedBox(height: 12),
            for (final a in allocation) _weightRow(a.$1, '', a.$2, a.$3),
          ],
        ),
      );

  Widget _riskMetricsCard() {
    final metrics = const [
      ('Max Drawdown', '-8.2%', red),
      ('Largest Position', '24%', accent),
      ('Volatility', '16.4%', Color(0xFF38BDF8)),
      ('Sharpe Ratio', '1.7', green),
    ];
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _panelDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Risk Metrics',
              style:
                  TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              for (final m in metrics)
                SizedBox(
                  width: (MediaQuery.of(context).size.width - 58) / 2,
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: panelSoft,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(m.$1,
                            style: const TextStyle(color: muted, fontSize: 12)),
                        const SizedBox(height: 6),
                        Text(m.$2,
                            style: TextStyle(
                                color: m.$3,
                                fontSize: 18,
                                fontWeight: FontWeight.w900)),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _marketMoversCard() => Container(
        padding: const EdgeInsets.all(16),
        decoration: _panelDecoration(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Top Gainers',
                style: TextStyle(
                    color: Colors.white, fontWeight: FontWeight.w900)),
            const SizedBox(height: 10),
            _moverRow('NVDA', '+8.0%', true),
            _moverRow('AMD', '+6.0%', true),
            _moverRow('TSLA', '+5.0%', true),
            const SizedBox(height: 14),
            const Text('Top Losers',
                style: TextStyle(
                    color: Colors.white, fontWeight: FontWeight.w900)),
            const SizedBox(height: 10),
            _moverRow('AAPL', '-4.0%', false),
            _moverRow('MSFT', '-2.2%', false),
          ],
        ),
      );

  Widget _watchlistInsight(
      String symbol, String price, String change, String score, bool bullish) {
    final color = bullish ? green : red;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: _panelDecoration(),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(symbol,
                    style: const TextStyle(
                        color: Colors.white, fontWeight: FontWeight.w900)),
                const SizedBox(height: 4),
                Text('$price · $score',
                    style: const TextStyle(color: muted, fontSize: 12)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(change,
                  style: TextStyle(color: color, fontWeight: FontWeight.w900)),
              const SizedBox(height: 4),
              Text(bullish ? 'Bullish' : 'Bearish',
                  style: TextStyle(color: color, fontSize: 12)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _weightRow(String title, String subtitle, double pct, Color color) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: const TextStyle(
                        color: Colors.white, fontWeight: FontWeight.w800)),
                if (subtitle.isNotEmpty)
                  Text(subtitle,
                      style: const TextStyle(color: muted, fontSize: 11)),
                const SizedBox(height: 6),
                LinearProgressIndicator(
                  value: pct / 100,
                  minHeight: 7,
                  borderRadius: BorderRadius.circular(999),
                  backgroundColor: border,
                  color: color,
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text('${pct.toStringAsFixed(0)}%',
              style: const TextStyle(
                  color: Colors.white, fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }

  Widget _moverRow(String symbol, String change, bool up) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(
              child: Text(symbol,
                  style: const TextStyle(
                      color: Colors.white, fontWeight: FontWeight.w800))),
          Icon(up ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded,
              color: up ? green : red, size: 16),
          const SizedBox(width: 4),
          Text(change,
              style: TextStyle(
                  color: up ? green : red, fontWeight: FontWeight.w900)),
        ],
      ),
    );
  }

  Widget _sectionTitle(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: accent, size: 18),
        const SizedBox(width: 8),
        Text(title,
            style: const TextStyle(
                color: accent, fontSize: 18, fontWeight: FontWeight.w900)),
      ],
    );
  }

  Widget _portfolioCard(Map p) {
    return GestureDetector(
      onTap: () => Navigator.push(context,
          MaterialPageRoute(builder: (_) => PortfolioScreen(portfolio: p))),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: _panelDecoration(),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(p['name'] ?? '',
                      style: const TextStyle(
                          color: Colors.white, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 4),
                  Text(
                      '${p['type'] ?? 'STOCKS'} · ${p['baseCurrency'] ?? 'USD'}',
                      style: const TextStyle(color: muted, fontSize: 12)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: muted),
          ],
        ),
      ),
    );
  }

  Widget _goalCard(Map g) {
    final current = ((g['currentAmount'] ?? 0) as num).toDouble();
    final target = ((g['targetAmount'] ?? 1) as num).toDouble();
    final pct = target > 0 ? (current / target).clamp(0.0, 1.0) : 0.0;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: _panelDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(g['name'] ?? '',
              style: const TextStyle(
                  color: Colors.white, fontWeight: FontWeight.w900)),
          const SizedBox(height: 12),
          LinearProgressIndicator(
            value: pct,
            minHeight: 8,
            borderRadius: BorderRadius.circular(999),
            backgroundColor: border,
            color: accent,
          ),
          const SizedBox(height: 8),
          Text(
              '${(pct * 100).toStringAsFixed(0)}% · ${g['targetAmount']} ${g['currency']}',
              style: const TextStyle(color: muted, fontSize: 12)),
        ],
      ),
    );
  }

  Widget _marketRow(String symbol) {
    final quote = market[symbol];
    final price = quote?['price'];
    final change =
        ((quote?['changePercent'] ?? quote?['change'] ?? 0) as num).toDouble();
    final isUp = change >= 0;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: _panelDecoration(),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(symbol,
                    style: const TextStyle(
                        color: Colors.white, fontWeight: FontWeight.w900)),
                const SizedBox(height: 3),
                Text(
                    price == null
                        ? 'Đang chờ dữ liệu'
                        : '\$${(price as num).toStringAsFixed(2)}',
                    style: const TextStyle(color: muted, fontSize: 12)),
              ],
            ),
          ),
          Icon(isUp ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded,
              color: isUp ? green : red, size: 18),
          const SizedBox(width: 4),
          Text(
            '${isUp ? '+' : ''}${change.toStringAsFixed(2)}%',
            style: TextStyle(
                color: isUp ? green : red, fontWeight: FontWeight.w900),
          ),
        ],
      ),
    );
  }

  Widget _plainCard(String title, String subtitle) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: _panelDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: const TextStyle(
                  color: Colors.white, fontWeight: FontWeight.w900)),
          const SizedBox(height: 6),
          Text(subtitle, style: const TextStyle(color: muted, height: 1.35)),
        ],
      ),
    );
  }

  Widget _messageCard(String title, String message, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: _panelDecoration(),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: accent),
          const SizedBox(width: 12),
          Expanded(child: _plainText(title, message)),
        ],
      ),
    );
  }

  Widget _emptyCard(String text) =>
      _plainCard(text, 'Kéo xuống để làm mới dữ liệu.');

  Widget _plainText(String title, String message) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title,
            style: const TextStyle(
                color: Colors.white, fontWeight: FontWeight.w900)),
        const SizedBox(height: 6),
        Text(message, style: const TextStyle(color: muted, height: 1.35)),
      ],
    );
  }

  BoxDecoration _panelDecoration() {
    return BoxDecoration(
      color: panel,
      borderRadius: BorderRadius.circular(8),
      border: Border.all(color: border),
    );
  }

  List<Map<String, dynamic>> _buildHoldings() {
    final holdings = <String, Map<String, dynamic>>{};

    for (final tx in allTransactions) {
      final symbol = (tx['assetSymbol'] ?? '').toString().toUpperCase();
      if (symbol.isEmpty) continue;

      final quantity = ((tx['quantity'] ?? 0) as num).toDouble();
      final price = ((tx['price'] ?? 0) as num).toDouble();
      final type = (tx['type'] ?? '').toString().toUpperCase();

      holdings.putIfAbsent(symbol, () => {
            'symbol': symbol,
            'name': (tx['assetName'] ?? symbol).toString(),
            'quantity': 0.0,
            'cost': 0.0,
            'value': 0.0,
            'changePercent': 0.0,
          });

      final entry = holdings[symbol]!;
      if (type == 'BUY') {
        entry['quantity'] = (entry['quantity'] as double) + quantity;
        entry['cost'] = (entry['cost'] as double) + (quantity * price);
      } else if (type == 'SELL') {
        final existingQty = entry['quantity'] as double;
        final avgCost = existingQty > 0 ? (entry['cost'] as double) / existingQty : price;
        entry['quantity'] = (existingQty - quantity).clamp(0.0, double.infinity);
        entry['cost'] = ((entry['cost'] as double) - (avgCost * quantity)).clamp(0.0, double.infinity);
      }
    }

    final active = holdings.values.where((item) => (item['quantity'] as double) > 0).toList();

    for (final item in active) {
      final quote = market[item['symbol']] ?? {};
      final currentPrice = ((quote?['price'] ?? 0) as num).toDouble();
      final quantity = item['quantity'] as double;
      item['value'] = quantity * currentPrice;
      item['changePercent'] = ((quote?['changePercent'] ?? 0) as num).toDouble();
    }

    final totalValue = active.fold<double>(0, (sum, item) => sum + (item['value'] as double));
    for (final item in active) {
      final value = item['value'] as double;
      item['weight'] = totalValue > 0 ? (value / totalValue) * 100 : 0.0;
    }

    active.sort((a, b) => ((b['value'] as double).compareTo(a['value'] as double)));
    return active;
  }
}

class _PerformancePainter extends CustomPainter {
  const _PerformancePainter(this.values);

  final List<double> values;

  @override
  void paint(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = _DashboardScreenState.border.withOpacity(0.55)
      ..strokeWidth = 1;
    for (var i = 1; i < 4; i++) {
      final y = size.height * i / 4;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    final path = Path();
    for (var i = 0; i < values.length; i++) {
      final x = values.length == 1 ? 0.0 : size.width * i / (values.length - 1);
      final y = size.height - (values[i].clamp(0.0, 1.0) * size.height);
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    final fillPath = Path.from(path)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(
      fillPath,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0x6638BDF8), Color(0x0038BDF8)],
        ).createShader(Offset.zero & size),
    );
    canvas.drawPath(
      path,
      Paint()
        ..color = const Color(0xFF38BDF8)
        ..strokeWidth = 3
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );
  }

  @override
  bool shouldRepaint(covariant _PerformancePainter oldDelegate) =>
      oldDelegate.values != values;
}

class _BottomTabs extends StatelessWidget {
  const _BottomTabs({
    required this.tabs,
    required this.currentIndex,
    required this.onTap,
  });

  final List<_TabSpec> tabs;
  final int currentIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: _DashboardScreenState.panel,
        border: Border(top: BorderSide(color: _DashboardScreenState.border)),
      ),
      padding: const EdgeInsets.fromLTRB(6, 8, 6, 10),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            for (int i = 0; i < tabs.length; i++)
              Expanded(
                child: _BottomTabButton(
                  tab: tabs[i],
                  selected: i == currentIndex,
                  onTap: () => onTap(i),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _BottomTabButton extends StatelessWidget {
  const _BottomTabButton({
    required this.tab,
    required this.selected,
    required this.onTap,
  });

  final _TabSpec tab;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(8),
      onTap: onTap,
      child: Container(
        height: 54,
        margin: const EdgeInsets.symmetric(horizontal: 2),
        decoration: BoxDecoration(
          color: selected ? _DashboardScreenState.accent : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              tab.icon,
              color: selected
                  ? _DashboardScreenState.appBg
                  : _DashboardScreenState.muted,
              size: 19,
            ),
            const SizedBox(height: 3),
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                tab.label,
                maxLines: 1,
                style: TextStyle(
                  color: selected
                      ? _DashboardScreenState.appBg
                      : _DashboardScreenState.muted,
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TabSpec {
  const _TabSpec(this.label, this.icon);

  final String label;
  final IconData icon;
}
