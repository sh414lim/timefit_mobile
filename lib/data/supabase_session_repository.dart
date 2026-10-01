import 'package:supabase_flutter/supabase_flutter.dart';

import '../domain/app_session.dart';
import '../domain/session_repository.dart';

class SupabaseSessionRepository implements SessionRepository {
  SupabaseSessionRepository(this._client);
  final SupabaseClient _client;

  @override
  Future<AppSession?> restore() async =>
      _client.auth.currentSession == null ? null : _bootstrap();

  @override
  Future<AppSession> signIn({
    required String email,
    required String password,
  }) async {
    final response = await _client.auth.signInWithPassword(
      email: email.trim(),
      password: password,
    );
    if (response.user == null) throw const AuthException('로그인에 실패했어요.');
    return _bootstrap();
  }

  Future<AppSession> _bootstrap() async {
    final user = _client.auth.currentUser;
    if (user == null) throw const AuthException('로그인이 필요해요.');
    final response = await _client.rpc('timefit_user_mobile_bootstrap');
    final payload = Map<String, dynamic>.from(response as Map);
    final organizations = (payload['organizations'] as List? ?? const [])
        .map(
          (item) => OrganizationContext.fromJson(
            Map<String, dynamic>.from(item as Map),
          ),
        )
        .toList(growable: false);
    return AppSession(
      userId: user.id,
      email: user.email,
      organizations: organizations,
    );
  }

  @override
  Future<void> signOut() => _client.auth.signOut();
}
