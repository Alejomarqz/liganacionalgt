#import "AppDelegate.h"
#import <React/RCTBundleURLProvider.h>
#import <UIKit/UIKit.h>
#import <objc/runtime.h>
#import <Firebase.h>
#import <React/RCTView.h>
#import <RNScreens/RNSScreen.h>

#pragma mark - ========= SHIMS ============

// Setter dummy (firma correcta para "v@:@")
static void FCNoopSetter(id self, SEL _cmd, id value) {
  // no-op
}

// Getter dummy para activityState
static NSInteger FCActivityStateGetter(id self, SEL _cmd) {
  return 0;
}

static void FCInstallSheetShimsInternal(void) {
  const char *setterTypes = "v@:@";  // void(self,_cmd,id)
  const char *getterTypes = "q@:";   // NSInteger(self,_cmd)

  SEL sels[] = {
    sel_registerName("setSheetInitialDetent:"),
    sel_registerName("setSheetSelectedDetent:"),
    sel_registerName("setSheetLargestUndimmedDetent:"),
    sel_registerName("setSheetAllowedDetents:"),
    sel_registerName("setSheetDetents:"),
    sel_registerName("setSheetGrabberVisible:"),
    sel_registerName("setSheetCornerRadius:"),
    sel_registerName("setSheetPrefersEdgeAttached:"),
    sel_registerName("setSheetWidthFollowsPreferred:"),
    sel_registerName("setSheetPrefersScrollingExpandsWhenScrolledToEdge:"),
    sel_registerName("setSheetExpandsWhenScrolledToEdge:"),

    // gesture
    sel_registerName("setOnGestureCancel:"),
    sel_registerName("setOnGestureStart:"),
    sel_registerName("setOnGestureChange:"),
    sel_registerName("setOnGestureEnd:"),
    sel_registerName("setGestureResponseDistance:"),

    // activity
    sel_registerName("setActivityStateOrNil:"),
    sel_registerName("setActivityState:"),

    // react-screens
    sel_registerName("setReactSuperview:"),
  };

  Class rctViewCls        = NSClassFromString(@"RCTView");
  Class rnsScreenViewCls  = NSClassFromString(@"RNSScreenView");

  // PARCHE SOLO A CLASES DE RN — NO A UIView global
  int count = (int)(sizeof(sels) / sizeof(SEL));
  for (int i = 0; i < count; i++) {
    SEL sel = sels[i];

    if (rctViewCls && !class_respondsToSelector(rctViewCls, sel)) {
      class_addMethod(rctViewCls, sel, (IMP)FCNoopSetter, setterTypes);
    }

    if (rnsScreenViewCls && !class_respondsToSelector(rnsScreenViewCls, sel)) {
      class_addMethod(rnsScreenViewCls, sel, (IMP)FCNoopSetter, setterTypes);
    }
  }

  // activityState
  SEL activitySel = sel_registerName("activityState");

  if (rctViewCls && !class_respondsToSelector(rctViewCls, activitySel)) {
    class_addMethod(rctViewCls, activitySel, (IMP)FCActivityStateGetter, getterTypes);
  }

  if (rnsScreenViewCls && !class_respondsToSelector(rnsScreenViewCls, activitySel)) {
    class_addMethod(rnsScreenViewCls, activitySel, (IMP)FCActivityStateGetter, getterTypes);
  }

  NSLog(@"[FCSheetShims] installed (RN-SAFE)");
}

// === Carga temprana SOLO para instalar en clases de RN
@interface RCTView (FCSheetShims) @end
@implementation RCTView (FCSheetShims)
+ (void)load { FCInstallSheetShimsInternal(); }
@end

@interface RNSScreenView (FCSheetShims) @end
@implementation RNSScreenView (FCSheetShims)
+ (void)load { FCInstallSheetShimsInternal(); }
@end

// Llamada extra en AppDelegate
static inline void FCInstallSheetShimsInline(void) {
  FCInstallSheetShimsInternal();
}

#pragma mark - ============ FIN SHIMS ============

@implementation AppDelegate

// NECESARIO PARA ADMOB EN FULLSCREEN (interstitials)
- (UIViewController *)rootViewControllerForPresentingModalView {
  return self.window.rootViewController;
}

// (opcional / legacy) Google Ads fallback
- (UIViewController *)application:(UIApplication *)application
     viewControllerForPresentingInterstitialAdFromAd:(id)ad
{
  return self.window.rootViewController;
}

- (UIViewController *)rootViewControllerForPresentedViewController {
  return self.window.rootViewController;
}

- (BOOL)application:(UIApplication *)application
        didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Refuerza tus shims al arrancar
  FCInstallSheetShimsInline();

  // Firebase seguro
  if ([FIRApp defaultApp] == nil) {
    [FIRApp configure];
  }

  self.moduleName   = @"chapin";
  self.initialProps = @{};

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

// URL del bundle JS
- (NSURL *)bundleURL
{
#if DEBUG
  return [NSURL URLWithString:
          @"http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

// 🔥 ESTE MÉTODO ES EL QUE FALTABA
- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

@end
