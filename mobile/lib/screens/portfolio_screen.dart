import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../utils/formatters.dart';

class PortfolioScreen extends StatefulWidget {
  final Map portfolio;
  const PortfolioScreen({super.key, required this.portfolio});

  @override
  State<PortfolioScreen> createState() => _PortfolioScreenState();
}

class _PortfolioScreenState extends State<PortfolioScreen> {
  List transactions = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    loadTransactions();
  }

  Future<void> loadTransactions() async {
    try {
      final data = await ApiService.getTransactions(widget.portfolio['id']);
      setState(() {
        transactions = data;
        loading = false;
      });
    } catch (e) {
      setState(() {
        loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final totalBuy = transactions
        .where((t) => (t['type'] ?? '').toUpperCase() == 'BUY')
        .fold<double>(0, (sum, t) => sum + (((t['quantity'] ?? 0) as num).toDouble() * ((t['price'] ?? 0) as num).toDouble()));
    final totalSell = transactions
        .where((t) => (t['type'] ?? '').toUpperCase() == 'SELL')
        .fold<double>(0, (sum, t) => sum + (((t['quantity'] ?? 0) as num).toDouble() * ((t['price'] ?? 0) as num).toDouble()));
    final netFlow = totalSell - totalBuy;
    final totalQuantity = transactions.fold<double>(
      0,
      (sum, tx) => sum + (((tx['quantity'] ?? 0) as num).toDouble()),
    );

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: Text(
          widget.portfolio['name'] ?? '',
          style: const TextStyle(color: Colors.white),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: loadTransactions,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Row(
                    children: [
                      _statCard("Tổng GD", transactions.length.toString(), Colors.blue),
                      const SizedBox(width: 12),
                      _statCard("Tổng mua", formatCompactCurrency(totalBuy), Colors.green),
                      const SizedBox(width: 12),
                      _statCard("Tổng bán", formatCompactCurrency(totalSell), Colors.red),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _statCard("Dòng tiền ròng", formatSignedCurrency(netFlow), netFlow >= 0 ? Colors.green : Colors.red),
                      const SizedBox(width: 12),
                      _statCard("KL giao dịch", formatCompactNumber(totalQuantity), const Color(0xFF38BDF8)),
                    ],
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    "Lịch sử giao dịch",
                    style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                  if (transactions.isEmpty)
                    const Center(
                      child: Text(
                        "Chưa có giao dịch nào",
                        style: TextStyle(color: Color(0xFF64748B)),
                      ),
                    ),
                  ...transactions.map((t) => _txCard(t)),
                ],
              ),
            ),
    );
  }

  Widget _statCard(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }

  Widget _txCard(Map t) {
    final isBuy = (t['type'] ?? '').toUpperCase() == 'BUY';
    final quantity = ((t['quantity'] ?? 0) as num).toDouble();
    final price = ((t['price'] ?? 0) as num).toDouble();
    final total = quantity * price;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isBuy ? Colors.green.withOpacity(0.1) : Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  isBuy ? "MUA" : "BÁN",
                  style: TextStyle(
                    color: isBuy ? Colors.green : Colors.red,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    t['assetSymbol'] ?? '',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    "${formatCompactNumber(quantity)} @ ${formatCompactCurrency(price)}",
                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                  ),
                ],
              ),
            ],
          ),
          Text(
            "${isBuy ? '-' : '+'}${formatCompactCurrency(total)}",
            style: TextStyle(
              color: isBuy ? Colors.redAccent : Colors.greenAccent,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
