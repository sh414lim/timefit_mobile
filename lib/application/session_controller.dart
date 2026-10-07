import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../domain/app_session.dart';
import '../domain/session_repository.dart';

enum SessionStatus { loading, signedOut, signedIn, failure }

enum WorkspaceMode { employee, manager }

class SessionController extends ChangeNotifier {
  SessionController(this._repository);
  static const organizationPreferenceKey = 'timefit.selected_organization_id';
  static const workspaceModePreferenceKey = 'timefit.workspace_mode';
  final SessionRepository _repository;

  SessionStatus status = SessionStatus.loading;
  AppSession? session;
  OrganizationContext? currentOrganization;
  String? errorMessage;
  WorkspaceMode workspaceMode = WorkspaceMode.employee;

  bool get canUseManagerMode =>
      currentOrganization?.hasManagementAccess ?? false;
  bool get isManagerMode =>
      workspaceMode == WorkspaceMode.manager && canUseManagerMode;

  Future<void> initialize() async {
    status = SessionStatus.loading;
    notifyListeners();
    try {
      final restored = await _repository.restore();
      if (restored == null) {
        status = SessionStatus.signedOut;
      } else {
        await _acceptSession(restored);
      }
    } catch (_) {
      status = SessionStatus.failure;
      errorMessage = '정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';
    }
    notifyListeners();
  }

  Future<void> signIn(String email, String password) async {
    status = SessionStatus.loading;
    errorMessage = null;
    notifyListeners();
    try {
      await _acceptSession(
        await _repository.signIn(email: email, password: password),
      );
    } catch (_) {
      status = SessionStatus.signedOut;
      errorMessage = '이메일 또는 비밀번호를 확인해 주세요.';
    }
    notifyListeners();
  }

  Future<void> selectOrganization(OrganizationContext organization) async {
    currentOrganization = organization;
    final preferences = await SharedPreferences.getInstance();
    final storedMode = preferences.getString(workspaceModePreferenceKey);
    workspaceMode = organization.role != MemberRole.employee
        ? WorkspaceMode.manager
        : organization.hasManagementAccess &&
              storedMode == WorkspaceMode.manager.name
        ? WorkspaceMode.manager
        : WorkspaceMode.employee;
    notifyListeners();
    await preferences.setString(
      organizationPreferenceKey,
      organization.organizationId,
    );
  }

  Future<void> selectWorkspaceMode(WorkspaceMode mode) async {
    workspaceMode = mode == WorkspaceMode.manager && !canUseManagerMode
        ? WorkspaceMode.employee
        : mode;
    notifyListeners();
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(workspaceModePreferenceKey, workspaceMode.name);
  }

  Future<void> signOut() async {
    await _repository.signOut();
    session = null;
    currentOrganization = null;
    workspaceMode = WorkspaceMode.employee;
    status = SessionStatus.signedOut;
    notifyListeners();
  }

  Future<void> _acceptSession(AppSession next) async {
    session = next;
    final preferences = await SharedPreferences.getInstance();
    final selectedId = preferences.getString(organizationPreferenceKey);
    OrganizationContext? selected;
    for (final organization in next.organizations) {
      if (organization.organizationId == selectedId) selected = organization;
    }
    currentOrganization =
        selected ??
        (next.organizations.isEmpty ? null : next.organizations.first);
    final storedMode = preferences.getString(workspaceModePreferenceKey);
    workspaceMode = currentOrganization?.role != MemberRole.employee
        ? WorkspaceMode.manager
        : storedMode == WorkspaceMode.manager.name &&
              (currentOrganization?.hasManagementAccess ?? false)
        ? WorkspaceMode.manager
        : WorkspaceMode.employee;
    status = SessionStatus.signedIn;
  }
}
