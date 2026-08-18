---
title: Flutter CocoaPods to Swift Package Manager Migration Guide
subtitle: A practical guide to migrating an existing Flutter iOS application from CocoaPods to Swift Package Manager.
reading_time: 12 min
tags:
  - flutter
  - ios
  - swift-package-manager
  - cocoapods
  - flutter-development
takeaway: By the end of this article, you will be able to migrate an existing Flutter iOS application from CocoaPods to Swift Package Manager, identify dependencies that still require CocoaPods, and safely verify the migration before removing CocoaPods.
slug: /blog/flutter-cocoapods-to-swift-package-manager-migration/
meta_title: Flutter CocoaPods to Swift Package Manager Migration Guide
meta_description: Learn how to migrate an existing Flutter iOS application from CocoaPods to Swift Package Manager using Flutter 3.44. Review dependencies, migrate remaining Pods, verify the migration, and safely remove CocoaPods.
primary_keyword: Flutter CocoaPods to Swift Package Manager migration
secondary_keywords:
  - Flutter SPM migration
  - Flutter Swift Package Manager
  - Flutter CocoaPods migration
  - Flutter iOS SPM
  - Flutter 3.44 Swift Package Manager
---

# Flutter CocoaPods to Swift Package Manager Migration Guide

*A practical guide to migrating an existing Flutter iOS application from CocoaPods to Swift Package Manager.*

## Why Is This Migration Necessary?

For many years, CocoaPods has been the default dependency manager for iOS applications. Flutter also adopted CocoaPods as the standard mechanism for integrating native iOS dependencies.

That workflow is beginning to change.

The CocoaPods team has announced that the **[CocoaPods trunk will become read-only on December 2, 2026](https://blog.cocoapods.org/CocoaPods-Specs-Repo/)**. Existing Pods will continue to work, but developers will no longer be able to publish new specifications to the central repository.

Firebase has also announced that **[new Firebase releases will no longer be published through CocoaPods after October 2026](https://firebase.google.com/docs/ios/cocoapods-deprecation)**.

Existing Firebase integrations will continue to work, but future Firebase updates will require another installation method.

This does not mean that existing Flutter applications will suddenly stop working.

However, Flutter has already started moving toward Swift Package Manager, and this is a good time to begin planning the migration.

---

## What Is Swift Package Manager?

Swift Package Manager, commonly called **SPM**, is [Apple's native dependency manager](https://developer.apple.com/documentation/packagedescription) for Swift and Apple platform development.

Unlike CocoaPods, which depends on Ruby tooling and a separate dependency resolution process, Swift Package Manager is integrated directly into Xcode.

Packages can be added, resolved, and updated directly from Xcode without running `pod install`.

---

## Which Flutter Version Should You Use for Migration?

Before starting the migration, we evaluated multiple Flutter versions and found that **Flutter 3.44.0** provides the best migration experience.

We made two important observations while evaluating the migration.

### Flutter 3.38.4 Still Depends on CocoaPods

In Flutter **3.38.4**, Flutter dependencies are still resolved through CocoaPods.

Downstream dependencies also continue to follow the existing `Podfile` workflow.

Attempting to migrate an application while remaining on Flutter 3.38.4 would require manually translating Flutter's Pod-based integration into a corresponding Swift Package Manager configuration.

The migration effort would not stop with Flutter itself.

Every dependency that still depends on CocoaPods would also need to be evaluated and migrated individually.

### Flutter 3.44.0 Introduces Swift Package Manager by Default

Starting with **[Flutter 3.44.0](https://docs.flutter.dev/release/release-notes/release-notes-3.44.0)**, Swift Package Manager becomes the default dependency manager for Apple platform dependencies.

Flutter also continues to support CocoaPods as a fallback for dependencies that have not yet adopted Swift Package Manager.

Because of this change, we found that **upgrading to Flutter 3.44.0 or later is the most practical and sustainable migration strategy**. Flutter's [Swift Package Manager guide for app developers](https://docs.flutter.dev/packages-and-plugins/swift-package-manager/for-app-developers) is the reference point for this migration path.

By the end of this article, we are going to learn:

- How to prepare an existing Flutter project for migration
- How Flutter performs the Swift Package Manager migration
- How to identify dependencies that still rely on CocoaPods
- How to migrate remaining dependencies
- How to safely remove CocoaPods
- How to verify the migration

Let the coding begin..!

---

## 1) Upgrade Flutter to Version 3.44.0 or Later

The first step is to verify the current Flutter version.

```bash
flutter --version
```

If your project is still using an older version, upgrade Flutter.

```bash
flutter upgrade
```

Verify the version again.

```bash
flutter --version
```

If Swift Package Manager was previously disabled, enable it explicitly.

```bash
flutter config --enable-swift-package-manager
```

A few things to notice:

- Flutter 3.44 enables Swift Package Manager by default.
- Existing CocoaPods workflows continue to work.
- Upgrading Flutter before starting the migration reduces the amount of manual migration work.
- Commit your current project state before moving to the next step.

Before continuing, make sure that:

- Flutter is upgraded to version 3.44 or above.
- The existing project builds successfully.
- `Podfile.lock` is committed.
- Current dependency versions are committed.
- CI builds are passing.

---

## 2) Review Existing CocoaPods Dependencies

Before deleting any CocoaPods files, review your current dependency configuration.

Inspect:

```text
pubspec.yaml
ios/Podfile
ios/Podfile.lock
```

Separate dependencies into two categories.

### Flutter-managed dependencies

Dependencies introduced through Flutter plugins.

### Native iOS dependencies

Dependencies declared directly inside the `Podfile`.

Also inspect your `Podfile` for custom scripts.

```ruby
post_install do |installer|
  ...
end
```

Search your project for references to:

```text
Pods/
Pods-Runner
${PODS_ROOT}
${PODS_CONFIGURATION_BUILD_DIR}
```

A few things to notice:

- Do not start by deleting the `Podfile`.
- Understand why CocoaPods exists in the project.
- Check whether your build scripts depend on CocoaPods.
- Identify third-party dependencies before starting the migration.

---

## 3) Let Flutter Perform the Swift Package Manager Migration

This step is different from a traditional native iOS migration.

Do not start with:

```bash
pod deintegrate
```

Instead, allow Flutter to perform the migration automatically.

Run:

```bash
flutter run
```

Flutter should automatically create:

```text
FlutterGeneratedPluginSwiftPackage
```

Verify:

- `FlutterGeneratedPluginSwiftPackage` exists.
- The package is attached to the `Runner` target.
- The package appears under **Frameworks, Libraries, and Embedded Content**.
- The application builds successfully in Xcode.
- `flutter run` completes successfully.

Flutter documents this automatic migration flow in the [Swift Package Manager guide for app developers](https://docs.flutter.dev/packages-and-plugins/swift-package-manager/for-app-developers).

---

## 4) Migrate Remaining Dependencies

After Flutter completes the migration, review any dependencies that still rely on CocoaPods.

Some projects may already be fully migrated.

Others may still depend on:

- Firebase
- Analytics SDKs
- Third-party native SDKs
- Internal frameworks

For dependencies that were manually added to the `Podfile`, verify whether the vendor provides official Swift Package Manager support.

### What if a Third-Party Library Does Not Support Swift Package Manager?

#### Option 1: Keep CocoaPods Temporarily

Flutter continues to support CocoaPods as a [fallback](https://docs.flutter.dev/packages-and-plugins/swift-package-manager/for-app-developers).

If the dependency is actively maintained, keeping CocoaPods temporarily is usually the safest option.

#### Option 2: Upgrade the Dependency

Check whether a newer version of the library already supports Swift Package Manager.

Many libraries have added `Package.swift` support in recent releases. Upgrading the dependency may be enough to complete the migration.

#### Option 3: Replace the Dependency

If the library is no longer maintained, consider replacing it with an alternative.

#### Option 4: Integrate the Framework Manually

Some vendors distribute an `XCFramework` instead of providing a Swift package. Apple supports [distributing binary frameworks as Swift packages](https://developer.apple.com/documentation/xcode/distributing-binary-frameworks-as-swift-packages) for this case.

#### Option 5: Self-host the Library or Convert It Into a Private Swift Package

If you are working with internal libraries, private frameworks, or unmaintained dependencies, another option is to convert them into [private Swift packages](https://developer.apple.com/documentation/xcode/creating-a-standalone-swift-package-with-xcode).

The migration process usually involves:

1. Creating a `Package.swift` manifest.
2. Defining package products.
3. Organizing the source files.
4. Hosting the package in a private Git repository.
5. Adding the package through Xcode.

The [Swift Package Manager documentation](https://www.swift.org/package-manager/) is useful when you need to understand package layout and manifest behavior in more detail.

The goal is not to remove CocoaPods immediately.

---

## 5) Remove CocoaPods and Verify the Migration

Once every dependency has been migrated successfully, CocoaPods can be removed from the project.

Before removing CocoaPods, create a new commit or branch.

Remove CocoaPods integration.

```bash
pod deintegrate
```

Remove obsolete CocoaPods artifacts.

```text
Podfile
Podfile.lock
Pods/
```

Verify the migration.

```bash
flutter clean
flutter pub get
flutter run
flutter build ios
```

---

## 6) Check the Minimum iOS Deployment Target

Some Swift packages require a newer iOS version than the one currently configured in the Flutter project.

If a package fails to resolve after migration, verify the package's minimum iOS requirement before increasing the deployment target.

If you decide to change the deployment target, regenerate Flutter's iOS configuration. Flutter calls this out in the [Swift Package Manager guide for app developers](https://docs.flutter.dev/packages-and-plugins/swift-package-manager/for-app-developers).

```bash
flutter build ios --config-only
```

---

## 7) Add-to-App Projects Require a Different Migration Strategy

If Flutter is embedded inside an existing native iOS application, the migration process is different.

Flutter 3.44 introduces a Swift Package Manager integration through the generated `FlutterNativeIntegration` package.

Flutter can generate the package with:

```bash
flutter build swift-package --platform ios
```

If you're using an Add-to-App architecture, follow Flutter's [iOS Add-to-App setup documentation](https://docs.flutter.dev/add-to-app/ios/project-setup).

---

## Final Migration Checklist

### Preparation

- [ ] Flutter 3.44+
- [ ] Existing project builds successfully
- [ ] Clean Git state
- [ ] Flutter plugins reviewed
- [ ] Native Pods reviewed
- [ ] Custom `Podfile` scripts reviewed
- [ ] Firebase usage identified

### Flutter Migration

- [ ] Swift Package Manager enabled
- [ ] Application executed after the Flutter upgrade
- [ ] `FlutterGeneratedPluginSwiftPackage` generated
- [ ] Runner target linked correctly
- [ ] `flutter run` succeeds

### Dependency Migration

- [ ] Swift Package Manager compatible plugins verified
- [ ] Remaining CocoaPods dependencies identified
- [ ] Native dependencies migrated
- [ ] Targets verified

### CocoaPods Removal

- [ ] No remaining dependency requires CocoaPods
- [ ] CocoaPods deintegrated
- [ ] Pod artifacts removed
- [ ] Clean build verified

---

## Wrapup

Migrating from CocoaPods to Swift Package Manager in Flutter becomes much easier with Flutter 3.44 because Flutter performs most of the migration automatically.

Our recommendation is to upgrade Flutter first, allow Flutter to perform the migration, review the remaining dependencies, and remove CocoaPods only after the application has been fully verified.

Let's connect and you can find me on [Twitter](https://x.com/devinmaking).
