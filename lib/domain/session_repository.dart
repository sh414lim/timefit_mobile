import 'app_session.dart';

abstract interface class SessionRepository {
  Future<AppSession?> restore();
  Future<AppSession> signIn({required String email, required String password});
  Future<void> signOut();
}
