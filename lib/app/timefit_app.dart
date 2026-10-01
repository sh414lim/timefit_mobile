import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../application/session_controller.dart';
import '../core/config/app_config.dart';
import '../core/network/network_monitor.dart';
import '../core/theme/timefit_theme.dart';
import '../core/ui/state_view.dart';
import '../domain/session_repository.dart';
import '../presentation/auth/sign_in_screen.dart';
import '../presentation/config/unconfigured_screen.dart';
import '../presentation/shell/role_home_shell.dart';

class TimeFitApp extends StatefulWidget {
  const TimeFitApp({super.key, required this.config, required this.repository});

  final AppConfig config;
  final SessionRepository? repository;

  @override
  State<TimeFitApp> createState() => _TimeFitAppState();
}

class _TimeFitAppState extends State<TimeFitApp> {
  SessionController? _session;
  late final NetworkMonitor _network;
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    _network = NetworkMonitor();
    if (widget.repository != null) {
      _session = SessionController(widget.repository!)..initialize();
      _network.initialize();
    }
    _router = _createRouter();
  }

  GoRouter _createRouter() => GoRouter(
    initialLocation: '/',
    refreshListenable: _session,
    redirect: (context, state) {
      if (!widget.config.isConfigured) {
        return state.matchedLocation == '/setup' ? null : '/setup';
      }
      final session = _session!;
      return switch (session.status) {
        SessionStatus.loading =>
          state.matchedLocation == '/loading' ? null : '/loading',
        SessionStatus.signedOut =>
          state.matchedLocation == '/sign-in' ? null : '/sign-in',
        SessionStatus.signedIn =>
          state.matchedLocation == '/home' ? null : '/home',
        SessionStatus.failure =>
          state.matchedLocation == '/error' ? null : '/error',
      };
    },
    routes: [
      GoRoute(path: '/', builder: (context, state) => const SizedBox.shrink()),
      GoRoute(
        path: '/setup',
        builder: (context, state) => const UnconfiguredScreen(),
      ),
      GoRoute(
        path: '/loading',
        builder: (context, state) => const Scaffold(body: LoadingView()),
      ),
      GoRoute(
        path: '/sign-in',
        builder: (context, state) => SignInScreen(controller: _session!),
      ),
      GoRoute(
        path: '/home',
        builder: (context, state) => RoleHomeShell(controller: _session!),
      ),
      GoRoute(
        path: '/error',
        builder: (context, state) => Scaffold(
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: StateView.error(
                title: '정보를 불러오지 못했어요',
                description: _session?.errorMessage,
                actionLabel: '다시 시도',
                onAction: _session?.initialize,
              ),
            ),
          ),
        ),
      ),
    ],
  );

  @override
  void dispose() {
    _router.dispose();
    _network.dispose();
    _session?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp.router(
    title: 'TimeFit',
    debugShowCheckedModeBanner: !widget.config.isProduction,
    theme: TimeFitTheme.light(),
    routerConfig: _router,
    builder: (context, child) => AnimatedBuilder(
      animation: _network,
      builder: (context, _) => Column(
        children: [
          if (!_network.isOnline) const OfflineBanner(),
          Expanded(child: child ?? const SizedBox.shrink()),
        ],
      ),
    ),
  );
}
