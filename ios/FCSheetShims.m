// FCSheetShims.m
#import <UIKit/UIKit.h>
#import <objc/runtime.h>
#import "FCSheetShims.h"

static void FCNoopSetter(id self, SEL _cmd, id value) { /* no-op */ }

static void FCInstallSheetShimsInternal(void) {
  const char *types = "v@:@";
  SEL sels[] = {
    sel_registerName("setSheetLargestUndimmedDetent:"),
    sel_registerName("setSheetAllowedDetents:"),
    sel_registerName("setSheetSelectedDetent:"),
    sel_registerName("setSheetDetents:"),
    sel_registerName("setSheetGrabberVisible:"),
    sel_registerName("setSheetCornerRadius:"),
    sel_registerName("setSheetPrefersEdgeAttached:"),
    sel_registerName("setSheetWidthFollowsPreferred:"),
    sel_registerName("setSheetPrefersScrollingExpandsWhenScrolledToEdge:")
  };
  Class viewCls = [UIView class];
  Class rctViewCls = NSClassFromString(@"RCTView");

  for (int i = 0; i < (int)(sizeof(sels)/sizeof(SEL)); i++) {
    SEL sel = sels[i];
    if (!class_respondsToSelector(viewCls, sel)) {
      class_addMethod(viewCls, sel, (IMP)FCNoopSetter, types);
    }
    if (rctViewCls && !class_respondsToSelector(rctViewCls, sel)) {
      class_addMethod(rctViewCls, sel, (IMP)FCNoopSetter, types);
    }
  }
}

__attribute__((constructor))
static void FCInstallSheetShims(void) { FCInstallSheetShimsInternal(); }

// Llamada manual desde AppDelegate para garantizar la instalación.
void FCInstallSheetShimsManual(void) { FCInstallSheetShimsInternal(); }
