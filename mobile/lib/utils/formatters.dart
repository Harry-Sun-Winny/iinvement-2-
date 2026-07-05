String formatCompactCurrency(
  double value, {
  String symbol = '\$',
}) {
  final abs = value.abs();
  final prefix = value < 0 ? '-' : '';

  if (abs >= 1000000000000) {
    return '$prefix$symbol${(abs / 1000000000000).toStringAsFixed(2)}T';
  }
  if (abs >= 1000000000) {
    return '$prefix$symbol${(abs / 1000000000).toStringAsFixed(2)}B';
  }
  if (abs >= 1000000) {
    return '$prefix$symbol${(abs / 1000000).toStringAsFixed(2)}M';
  }
  if (abs >= 1000) {
    return '$prefix$symbol${(abs / 1000).toStringAsFixed(1)}K';
  }

  return '$prefix$symbol${abs.toStringAsFixed(2)}';
}

String formatCompactNumber(double value, {String suffix = ''}) {
  final abs = value.abs();
  final prefix = value < 0 ? '-' : '';

  if (abs >= 1000000000000) {
    return '$prefix${(abs / 1000000000000).toStringAsFixed(2)}T$suffix';
  }
  if (abs >= 1000000000) {
    return '$prefix${(abs / 1000000000).toStringAsFixed(2)}B$suffix';
  }
  if (abs >= 1000000) {
    return '$prefix${(abs / 1000000).toStringAsFixed(2)}M$suffix';
  }
  if (abs >= 1000) {
    return '$prefix${(abs / 1000).toStringAsFixed(1)}K$suffix';
  }

  return '$prefix${abs.toStringAsFixed(2)}$suffix';
}

String formatSignedPercent(double value) {
  return '${value >= 0 ? '+' : ''}${value.toStringAsFixed(2)}%';
}

String formatSignedCurrency(double value, {String symbol = '\$'}) {
  return '${value >= 0 ? '+' : '-'}${formatCompactCurrency(value.abs(), symbol: symbol)}';
}
