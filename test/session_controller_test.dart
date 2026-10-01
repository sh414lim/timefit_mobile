import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timefit_mobile/application/session_controller.dart';
import 'package:timefit_mobile/domain/app_session.dart';
import 'package:timefit_mobile/domain/session_repository.dart';

void main() {
  const first = OrganizationContext(
    organizationId: 'first',
    organizationName: '첫 사업장',
    role: MemberRole.employee,
  );
  const second = OrganizationContext(
    organizationId: 'second',
    organizationName: '두 번째 사업장',
    role: MemberRole.manager,
  );
  const session = AppSession(
    userId: 'user',
    email: 'user@time.fit',
    organizations: [first, second],
  );

  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('restores the last selected organization', () async {
    SharedPreferences.setMockInitialValues({
      SessionController.organizationPreferenceKey: 'second',
    });
    final controller = SessionController(_FakeRepository(session));

    await controller.initialize();

    expect(controller.status, SessionStatus.signedIn);
    expect(controller.currentOrganization?.organizationId, 'second');
  });

  test('uses the first organization when no selection was saved', () async {
    final controller = SessionController(_FakeRepository(session));
    await controller.initialize();
    expect(controller.currentOrganization?.organizationId, 'first');
  });
}

class _FakeRepository implements SessionRepository {
  _FakeRepository(this.session);
  final AppSession session;
  @override
  Future<AppSession?> restore() async => session;
  @override
  Future<AppSession> signIn({
    required String email,
    required String password,
  }) async => session;
  @override
  Future<void> signOut() async {}
}
