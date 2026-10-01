import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

class CachedJson {
  const CachedJson({required this.value, required this.savedAt});
  final Object? value;
  final DateTime savedAt;
}

class JsonCacheStore {
  const JsonCacheStore();

  Future<void> write(String key, Object? value) async {
    final payload = jsonEncode({
      'saved_at': DateTime.now().toUtc().toIso8601String(),
      'value': value,
    });
    await (await SharedPreferences.getInstance()).setString(
      'timefit.cache.$key',
      payload,
    );
  }

  Future<CachedJson?> read(String key) async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString('timefit.cache.$key');
    if (raw == null) return null;
    try {
      final payload = jsonDecode(raw) as Map<String, dynamic>;
      return CachedJson(
        value: payload['value'],
        savedAt: DateTime.parse(payload['saved_at'] as String),
      );
    } catch (_) {
      await preferences.remove('timefit.cache.$key');
      return null;
    }
  }

  Future<void> remove(String key) async {
    await (await SharedPreferences.getInstance()).remove('timefit.cache.$key');
  }
}
