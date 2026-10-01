import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../domain/app_session.dart';
import '../domain/session_repository.dart';

enum SessionStatus { loading, signedOut, signedIn, failure }

class SessionController extends ChangeNotifier {
  SessionController(this._repository);
  static const organizationPreferenceKey = 'timefit.selected_organization_id';
  final SessionRepository _repository;

  SessionStatus status = SessionStatus.loading;
  AppSession? session;
  OrganizationContext? currentOrganization;
  String? errorMessage;

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
    notifyListeners();
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      organizationPreferenceKey,
      organization.organizationId,
    );
  }

  Future<void> signOut() async {
    await _repository.signOut();
    session = null;
    currentOrganization = null;
    status = SessionStatus.signedOut;
    notifyListeners();
  }

  Future<void> _acceptSession(AppSession next) async {
    session = next;
    final selectedId = (await SharedPreferences.getInstance()).getString(
      organizationPreferenceKey,
    );
    OrganizationContext? selected;
    for (final organization in next.organizations) {
      if (organization.organizationId == selectedId) selected = organization;
    }
    currentOrganization =
        selected ??
        (next.organizations.isEmpty ? null : next.organizations.first);
    status = SessionStatus.signedIn;
  }
}
