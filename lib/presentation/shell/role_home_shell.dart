import 'package:flutter/material.dart';
import '../../application/session_controller.dart';
import '../../core/theme/timefit_theme.dart';
import '../../domain/app_session.dart';

class RoleHomeShell extends StatefulWidget {
  const RoleHomeShell({super.key, required this.controller});
  final SessionController controller;
  @override
  State<RoleHomeShell> createState() => _RoleHomeShellState();
}

class _RoleHomeShellState extends State<RoleHomeShell> {
  int index = 0;
  @override
  Widget build(BuildContext context) {
    final organization = widget.controller.currentOrganization;
    if (organization == null) {
      return _NoOrganization(controller: widget.controller);
    }
    final manager = organization.role != MemberRole.employee;
    final labels = manager
        ? const ['홈', '직원', '스케줄', '승인', '전체']
        : const ['홈', '스케줄', '출퇴근', '요청', '전체'];
    final icons = manager
        ? const [
            Icons.home_rounded,
            Icons.groups_rounded,
            Icons.calendar_month_rounded,
            Icons.task_alt_rounded,
            Icons.menu_rounded,
          ]
        : const [
            Icons.home_rounded,
            Icons.calendar_month_rounded,
            Icons.fingerprint_rounded,
            Icons.edit_calendar_rounded,
            Icons.menu_rounded,
          ];
    return Scaffold(
      body: index == 0
          ? _RoleHome(controller: widget.controller, organization: organization)
          : _PlaceholderPage(title: labels[index]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() => index = value),
        destinations: List.generate(
          labels.length,
          (item) => NavigationDestination(
            icon: Icon(icons[item]),
            label: labels[item],
          ),
        ),
      ),
    );
  }
}

class _RoleHome extends StatelessWidget {
  const _RoleHome({required this.controller, required this.organization});
  final SessionController controller;
  final OrganizationContext organization;
  @override
  Widget build(BuildContext context) {
    final manager = organization.role != MemberRole.employee;
    final name = organization.displayName?.trim().isNotEmpty == true
        ? '${organization.displayName}님'
        : organization.role.label;
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      organization.organizationName,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$name, 반가워요',
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: () {},
                icon: const Icon(Icons.notifications_none_rounded),
              ),
            ],
          ),
          const SizedBox(height: 32),
          Text(
            manager ? '오늘 운영 현황' : '오늘 근무',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    manager ? Icons.storefront_rounded : Icons.schedule_rounded,
                    color: TimeFitColors.blue,
                    size: 30,
                  ),
                  const SizedBox(height: 18),
                  Text(
                    manager ? '사업장 현황을 한눈에 확인하세요' : '내 근무 정보를 한곳에서 확인하세요',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    manager
                        ? '직원, 스케줄, 승인 업무를 빠르게 처리할 수 있어요.'
                        : '스케줄, 출퇴근, 휴가 요청을 간편하게 관리할 수 있어요.',
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 28),
          Text('빠른 메뉴', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _QuickAction(
                  icon: manager
                      ? Icons.person_add_alt_1_rounded
                      : Icons.calendar_month_rounded,
                  label: manager ? '직원 관리' : '내 스케줄',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _QuickAction(
                  icon: manager
                      ? Icons.task_alt_rounded
                      : Icons.edit_calendar_rounded,
                  label: manager ? '승인 처리' : '휴가 요청',
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          TextButton(onPressed: controller.signOut, child: const Text('로그아웃')),
        ],
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({required this.icon, required this.label});
  final IconData icon;
  final String label;
  @override
  Widget build(BuildContext context) => Card(
    child: InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: () {},
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: TimeFitColors.blue),
            const SizedBox(height: 20),
            Text(label, style: Theme.of(context).textTheme.titleMedium),
          ],
        ),
      ),
    ),
  );
}

class _PlaceholderPage extends StatelessWidget {
  const _PlaceholderPage({required this.title});
  final String title;
  @override
  Widget build(BuildContext context) => SafeArea(
    child: Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 16),
          const Text('기능을 순차적으로 연결하고 있어요.'),
        ],
      ),
    ),
  );
}

class _NoOrganization extends StatelessWidget {
  const _NoOrganization({required this.controller});
  final SessionController controller;
  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.business_outlined, size: 52),
              const SizedBox(height: 20),
              Text(
                '연결된 사업장이 없어요',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              const Text('관리자에게 초대를 요청하거나 사업장을 등록해 주세요.'),
              const SizedBox(height: 24),
              TextButton(
                onPressed: controller.signOut,
                child: const Text('다른 계정으로 로그인'),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
