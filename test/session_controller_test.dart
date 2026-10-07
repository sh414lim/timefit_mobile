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
  const delegated = OrganizationContext(
    organizationId: 'delegated',
    organizationName: '권한 위임 사업장',
    role: MemberRole.employee,
    managementRoleCode: 'store_manager',
    managementPermissions: {'dashboard.view', 'schedule.manage'},
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

  test('restores manager mode for an employee with delegated access', () async {
    SharedPreferences.setMockInitialValues({
      SessionController.organizationPreferenceKey: 'delegated',
      SessionController.workspaceModePreferenceKey: WorkspaceMode.manager.name,
    });
    const delegatedSession = AppSession(
      userId: 'user',
      email: 'user@time.fit',
      organizations: [delegated],
    );
    final controller = SessionController(_FakeRepository(delegatedSession));

    await controller.initialize();

    expect(controller.canUseManagerMode, isTrue);
    expect(controller.isManagerMode, isTrue);
    expect(controller.currentOrganization?.can('schedule.manage'), isTrue);
    expect(controller.currentOrganization?.can('employee.manage'), isFalse);
  });

  test(
    'falls back to employee mode after delegated access is revoked',
    () async {
      SharedPreferences.setMockInitialValues({
        SessionController.workspaceModePreferenceKey:
            WorkspaceMode.manager.name,
      });
      final controller = SessionController(_FakeRepository(session));

      await controller.initialize();
      await controller.selectWorkspaceMode(WorkspaceMode.manager);

      expect(controller.isManagerMode, isFalse);
      expect(controller.workspaceMode, WorkspaceMode.employee);
    },
  );

  test('selecting a native manager organization opens manager mode', () async {
    final controller = SessionController(_FakeRepository(session));
    await controller.initialize();

    await controller.selectOrganization(second);

    expect(controller.isManagerMode, isTrue);
  });

  test('parses scoped management access from the mobile bootstrap', () {
    final organization = OrganizationContext.fromJson({
      'organization_id': 'buttervilla',
      'organization_name': '버터빌라',
      'role': 'employee',
      'management_role_code': 'store_manager',
      'management_permissions': ['dashboard.view', 'leave.review'],
    });

    expect(organization.hasManagementAccess, isTrue);
    expect(organization.can('leave.review'), isTrue);
    expect(organization.can('employee.manage'), isFalse);
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
