enum MemberRole { owner, manager, employee }

extension MemberRoleLabel on MemberRole {
  String get label => switch (this) {
    MemberRole.owner => '사업주',
    MemberRole.manager => '관리자',
    MemberRole.employee => '직원',
  };
}

class OrganizationContext {
  const OrganizationContext({
    required this.organizationId,
    required this.organizationName,
    required this.role,
    this.staffId,
    this.displayName,
    this.department,
    this.jobTitle,
    this.managementRoleCode,
    this.managementPermissions = const <String>{},
  });
  factory OrganizationContext.fromJson(Map<String, dynamic> json) {
    final role = MemberRole.values.firstWhere(
      (value) => value.name == json['role'],
      orElse: () => MemberRole.employee,
    );
    return OrganizationContext(
      organizationId: json['organization_id'] as String,
      organizationName: json['organization_name'] as String? ?? '사업장',
      role: role,
      staffId: json['staff_id'] as String?,
      displayName: json['display_name'] as String?,
      department: json['department'] as String?,
      jobTitle: json['job_title'] as String?,
      managementRoleCode: json['management_role_code'] as String?,
      managementPermissions:
          (json['management_permissions'] as List? ?? const [])
              .map((value) => value.toString())
              .toSet(),
    );
  }
  final String organizationId;
  final String organizationName;
  final MemberRole role;
  final String? staffId;
  final String? displayName;
  final String? department;
  final String? jobTitle;
  final String? managementRoleCode;
  final Set<String> managementPermissions;

  bool get hasManagementAccess =>
      role != MemberRole.employee ||
      (managementRoleCode != null && managementPermissions.isNotEmpty);

  bool can(String permission) =>
      role != MemberRole.employee || managementPermissions.contains(permission);
}

class AppSession {
  const AppSession({
    required this.userId,
    required this.email,
    required this.organizations,
  });
  final String userId;
  final String? email;
  final List<OrganizationContext> organizations;
}
