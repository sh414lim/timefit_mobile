import 'package:flutter/material.dart';

import '../application/session_controller.dart';
import '../core/config/app_config.dart';
import '../core/theme/timefit_theme.dart';
import '../data/supabase_session_repository.dart';
import '../presentation/auth/sign_in_screen.dart';
import '../presentation/config/unconfigured_screen.dart';
import '../presentation/shell/role_home_shell.dart';

class TimeFitApp extends StatefulWidget {
  const TimeFitApp({super.key, required this.config, required this.repository});
  final AppConfig config;
  final SupabaseSessionRepository? repository;

  @override
  State<TimeFitApp> createState() => _TimeFitAppState();
}

class _TimeFitAppState extends State<TimeFitApp> {
  SessionController? controller;
  @override
  void initState() {
    super.initState();
    if (widget.repository != null) {
      controller = SessionController(widget.repository!)..initialize();
    }
  }

  @override
  void dispose() {
    controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'TimeFit',
    debugShowCheckedModeBanner: false,
    theme: TimeFitTheme.light(),
    home: widget.config.isConfigured
        ? AnimatedBuilder(
            animation: controller!,
            builder: (context, child) => _home(controller!),
          )
        : const UnconfiguredScreen(),
  );

  Widget _home(SessionController value) => switch (value.status) {
    SessionStatus.loading => const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    ),
    SessionStatus.signedOut => SignInScreen(controller: value),
    SessionStatus.signedIn => RoleHomeShell(controller: value),
    SessionStatus.failure => _FailureScreen(controller: value),
  };
}

class _FailureScreen extends StatelessWidget {
  const _FailureScreen({required this.controller});
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
              const Icon(Icons.cloud_off_rounded, size: 52),
              const SizedBox(height: 20),
              Text(controller.errorMessage ?? '문제가 발생했어요.'),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: controller.initialize,
                child: const Text('다시 시도'),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
