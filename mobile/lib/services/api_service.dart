import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart' as http_parser;
import 'package:shared_preferences/shared_preferences.dart';

String get baseUrl {
  if (kIsWeb) {
    return 'http://localhost:8080';
  }
  if (defaultTargetPlatform == TargetPlatform.iOS) {
    return 'http://localhost:8080';
  }
  return 'http://10.0.2.2:8080';
}

String get stockProxyUrl {
  if (kIsWeb) {
    return 'http://localhost:3002';
  }
  if (defaultTargetPlatform == TargetPlatform.iOS) {
    return 'http://localhost:3002';
  }
  return 'http://10.0.2.2:3002';
}

// ============ MODELS ============

class Portfolio {
  final String id;
  final String userId;
  final String name;
  final String baseCurrency;
  final String type;
  final String createdAt;

  Portfolio({required this.id, required this.userId, required this.name, 
             required this.baseCurrency, required this.type, required this.createdAt});

  factory Portfolio.fromJson(Map<String, dynamic> j) => Portfolio(
    id: j['id'], userId: j['userId'], name: j['name'],
    baseCurrency: j['baseCurrency'], type: j['type'] ?? 'STOCKS',
    createdAt: j['createdAt'],
  );
}

class Transaction {
  final String id;
  final String portfolioId;
  final String assetSymbol;
  final String assetName;
  final String type;
  final double quantity;
  final double price;
  final String currency;
  final String transactionDate;
  final String? notes;

  Transaction({required this.id, required this.portfolioId, required this.assetSymbol,
               required this.assetName, required this.type, required this.quantity,
               required this.price, required this.currency, required this.transactionDate,
               this.notes});

  factory Transaction.fromJson(Map<String, dynamic> j) => Transaction(
    id: j['id'], portfolioId: j['portfolioId'], assetSymbol: j['assetSymbol'],
    assetName: j['assetName'], type: j['type'],
    quantity: (j['quantity'] as num).toDouble(),
    price: (j['price'] as num).toDouble(),
    currency: j['currency'], transactionDate: j['transactionDate'],
    notes: j['notes'],
  );
}

// ============ API SERVICE ============

class ApiService {
  // Token management
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
  }

  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
  }

  static Future<Map<String, String>> _headers() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // ============ AUTH ============

  /// Đăng nhập - trả về token nếu thành công
  static Future<bool> login(String email, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/v1/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      await saveToken(data['token']);
      return true;
    }
    return false;
  }

  /// Đăng ký tài khoản mới
  static Future<bool> register(String email, String password, String fullName) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/v1/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password, 'fullName': fullName}),
    );
    if (res.statusCode == 200 || res.statusCode == 201) {
      final data = jsonDecode(res.body);
      await saveToken(data['token']);
      return true;
    }
    return false;
  }

  /// Đăng xuất
  static Future<void> logout() async {
    await clearToken();
  }

  // ============ PORTFOLIO ============

  /// Lấy danh sách portfolio của user
  static Future<List<Map<String, dynamic>>> getPortfolios() async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/v1/portfolios'),
      headers: await _headers(),
    );
    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.cast<Map<String, dynamic>>();
    }
    throw Exception('Lỗi tải portfolio: ${res.statusCode}');
  }

  /// Tạo portfolio mới
  static Future<Portfolio> createPortfolio(String name, String baseCurrency, String type) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/v1/portfolios'),
      headers: await _headers(),
      body: jsonEncode({'name': name, 'baseCurrency': baseCurrency, 'type': type}),
    );
    if (res.statusCode == 201) {
      return Portfolio.fromJson(jsonDecode(res.body));
    }
    throw Exception('Lỗi tạo portfolio: ${res.statusCode}');
  }

  /// Xóa portfolio
  static Future<void> deletePortfolio(String id) async {
    final res = await http.delete(
      Uri.parse('$baseUrl/api/v1/portfolios/$id'),
      headers: await _headers(),
    );
    if (res.statusCode != 204) {
      throw Exception('Lỗi xóa portfolio: ${res.statusCode}');
    }
  }

  // ============ TRANSACTIONS ============

  /// Lấy danh sách giao dịch của portfolio
  static Future<List<Map<String, dynamic>>> getTransactions(String portfolioId) async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/v1/portfolios/$portfolioId/transactions'),
      headers: await _headers(),
    );
    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.cast<Map<String, dynamic>>();
    }
    throw Exception('Lỗi tải giao dịch: ${res.statusCode}');
  }

  /// Thêm giao dịch mới
  static Future<Transaction> createTransaction({
    required String portfolioId,
    required String assetSymbol,
    required String assetName,
    required String type,
    required double quantity,
    required double price,
    required String currency,
    required String transactionDate,
    String? notes,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/v1/portfolios/$portfolioId/transactions'),
      headers: await _headers(),
      body: jsonEncode({
        'assetSymbol': assetSymbol, 'assetName': assetName,
        'type': type, 'quantity': quantity, 'price': price,
        'currency': currency, 'transactionDate': transactionDate,
        if (notes != null) 'notes': notes,
      }),
    );
    if (res.statusCode == 201) {
      return Transaction.fromJson(jsonDecode(res.body));
    }
    throw Exception('Lỗi tạo giao dịch: ${res.statusCode}');
  }

  /// Xóa giao dịch
  static Future<void> deleteTransaction(String portfolioId, String transactionId) async {
    final res = await http.delete(
      Uri.parse('$baseUrl/api/v1/portfolios/$portfolioId/transactions/$transactionId'),
      headers: await _headers(),
    );
    if (res.statusCode != 204) {
      throw Exception('Lỗi xóa giao dịch: ${res.statusCode}');
    }
  }

  static Future<List<Map<String, dynamic>>> getWatchlists() async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/v1/watchlists'),
      headers: await _headers(),
    );
    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.cast<Map<String, dynamic>>();
    }
    return [];
  }

  static Future<List<Map<String, dynamic>>> getGoals() async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/v1/goals'),
      headers: await _headers(),
    );
    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data.cast<Map<String, dynamic>>();
    }
    return [];
  }

  // ============ STOCK PRICE ============

  /// Lấy giá cổ phiếu realtime từ Yahoo Finance (qua Next.js proxy)
  static Future<Map<String, dynamic>?> getStockPrice(String symbol) async {
    try {
      final res = await http.get(
        Uri.parse('$stockProxyUrl/api/stock-price?symbol=$symbol'),
      );
      if (res.statusCode == 200) return jsonDecode(res.body);
    } catch (_) {}
    return null;
  }

  static Future<List<JournalEntry>> getJournalEntries(String portfolioId, {String? symbol}) async {
    final query = symbol != null && symbol.isNotEmpty
        ? '?symbol=' + Uri.encodeQueryComponent(symbol)
        : '';
    final res = await http.get(
      Uri.parse('$baseUrl/api/v1/portfolios/$portfolioId/journal$query'),
      headers: await _headers(),
    );
    if (res.statusCode == 200) {
      final List data = jsonDecode(res.body);
      return data
          .map((e) => JournalEntry.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }
    throw Exception('Loi tai journal: ${res.statusCode}');
  }

  static Future<JournalAttachment> uploadJournalAttachment({
    required Uint8List bytes,
    required String fileName,
    required String attachmentType,
    String? mimeType,
  }) async {
    final token = await getToken();
    final request = http.MultipartRequest(
      'POST',
      Uri.parse('$baseUrl/api/v1/journal/attachments/upload'),
    );

    if (token != null && token.isNotEmpty) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    request.fields['attachmentType'] = attachmentType;
    request.files.add(
      http.MultipartFile.fromBytes(
        'file',
        bytes,
        filename: fileName,
        contentType: mimeType != null && mimeType.isNotEmpty
            ? _mediaTypeFromMime(mimeType)
            : null,
      ),
    );

    final streamed = await request.send();
    final response = await http.Response.fromStream(streamed);
    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = Map<String, dynamic>.from(jsonDecode(response.body));
      return JournalAttachment(
        id: '',
        storageKey: data['storage_key'],
        publicUrl: _resolveAttachmentUrl(data['public_url']),
        fileName: data['file_name'],
        attachmentType: data['attachment_type'],
        mimeType: data['mime_type'],
        sizeBytes: data['size_bytes'],
      );
    }
    throw Exception('Loi upload attachment: ${response.statusCode}');
  }

  static Future<JournalEntry> createJournalEntryWithUploads({
    required String portfolioId,
    String? symbol,
    required String title,
    required String content,
    String entryType = 'manual_note',
    List<String> tags = const [],
    bool isPinned = false,
    List<JournalUploadPayload> files = const [],
  }) async {
    final attachments = <JournalAttachment>[];
    for (final file in files) {
      attachments.add(
        await uploadJournalAttachment(
          bytes: file.bytes,
          fileName: file.fileName,
          attachmentType: file.attachmentType,
          mimeType: file.mimeType,
        ),
      );
    }

    return createJournalEntry(
      portfolioId: portfolioId,
      symbol: symbol,
      title: title,
      content: content,
      entryType: entryType,
      tags: tags,
      isPinned: isPinned,
      attachments: attachments,
    );
  }

  static Future<JournalEntry> createJournalEntry({
    required String portfolioId,
    String? symbol,
    required String title,
    required String content,
    String entryType = 'manual_note',
    List<String> tags = const [],
    bool isPinned = false,
    List<JournalAttachment> attachments = const [],
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/v1/portfolios/$portfolioId/journal'),
      headers: await _headers(),
      body: jsonEncode({
        'symbol': symbol,
        'entry_type': entryType,
        'title': title,
        'content': content,
        'tags': tags,
        'is_pinned': isPinned,
        'attachments': attachments.map((e) => e.toJson()).toList(),
      }),
    );
    if (res.statusCode == 200 || res.statusCode == 201) {
      return JournalEntry.fromJson(jsonDecode(res.body));
    }
    throw Exception('Loi tao journal: ${res.statusCode}');
  }
}

class JournalUploadPayload {
  final Uint8List bytes;
  final String fileName;
  final String attachmentType;
  final String? mimeType;

  const JournalUploadPayload({
    required this.bytes,
    required this.fileName,
    required this.attachmentType,
    this.mimeType,
  });
}

http_parser.MediaType _mediaTypeFromMime(String mimeType) {
  final parts = mimeType.split('/');
  if (parts.length != 2) {
    return http_parser.MediaType('application', 'octet-stream');
  }
  return http_parser.MediaType(parts[0], parts[1]);
}

String? _resolveAttachmentUrl(String? rawUrl) {
  if (rawUrl == null || rawUrl.isEmpty) return rawUrl;
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
  return '$baseUrl$rawUrl';
}

class JournalAttachment {
  final String id;
  final String? storageKey;
  final String? publicUrl;
  final String fileName;
  final String attachmentType;
  final String? mimeType;
  final int? sizeBytes;

  JournalAttachment({
    required this.id,
    required this.storageKey,
    required this.publicUrl,
    required this.fileName,
    required this.attachmentType,
    required this.mimeType,
    required this.sizeBytes,
  });

  factory JournalAttachment.fromJson(Map<String, dynamic> j) => JournalAttachment(
    id: j['id'],
    storageKey: j['storage_key'],
    publicUrl: _resolveAttachmentUrl(j['public_url']),
    fileName: j['file_name'],
    attachmentType: j['attachment_type'],
    mimeType: j['mime_type'],
    sizeBytes: j['size_bytes'],
  );

  Map<String, dynamic> toJson() => {
    'storage_key': storageKey,
    'public_url': publicUrl,
    'file_name': fileName,
    'attachment_type': attachmentType,
    'mime_type': mimeType,
    'size_bytes': sizeBytes,
  };
}

class JournalEntry {
  final String id;
  final String? symbol;
  final String entryType;
  final String title;
  final String content;
  final List<String> tags;
  final bool isPinned;
  final int attachmentCount;
  final String createdAt;
  final List<JournalAttachment> attachments;

  JournalEntry({
    required this.id,
    required this.symbol,
    required this.entryType,
    required this.title,
    required this.content,
    required this.tags,
    required this.isPinned,
    required this.attachmentCount,
    required this.createdAt,
    required this.attachments,
  });

  factory JournalEntry.fromJson(Map<String, dynamic> j) => JournalEntry(
    id: j['id'],
    symbol: j['symbol'],
    entryType: j['entry_type'],
    title: j['title'],
    content: j['content'],
    tags: ((j['tags'] as List?) ?? const []).map((e) => e.toString()).toList(),
    isPinned: j['is_pinned'] ?? false,
    attachmentCount: j['attachment_count'] ?? 0,
    createdAt: j['created_at'],
    attachments: ((j['attachments'] as List?) ?? const [])
        .map((e) => JournalAttachment.fromJson(Map<String, dynamic>.from(e)))
        .toList(),
  );
}










