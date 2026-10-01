import 'package:flutter/material.dart';

class PageScaffold extends StatelessWidget {
  const PageScaffold({
    super.key,
    required this.child,
    this.title,
    this.actions,
    this.bottomNavigationBar,
    this.padding = const EdgeInsets.fromLTRB(20, 20, 20, 32),
  });

  final Widget child;
  final String? title;
  final List<Widget>? actions;
  final Widget? bottomNavigationBar;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: title == null
        ? null
        : AppBar(title: Text(title!), actions: actions),
    bottomNavigationBar: bottomNavigationBar,
    body: SafeArea(
      child: Padding(padding: padding, child: child),
    ),
  );
}
