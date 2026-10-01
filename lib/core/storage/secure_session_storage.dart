import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class SecureSessionStorage extends LocalStorage {
  SecureSessionStorage({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();
  static const _sessionKey = 'timefit.supabase.session.v1';
  final FlutterSecureStorage _storage;

  @override
  Future<void> initialize() async {}
  @override
  Future<String?> accessToken() => _storage.read(key: _sessionKey);
  @override
  Future<bool> hasAccessToken() async => (await accessToken()) != null;
  @override
  Future<void> persistSession(String value) =>
      _storage.write(key: _sessionKey, value: value);
  @override
  Future<void> removePersistedSession() => _storage.delete(key: _sessionKey);
}
