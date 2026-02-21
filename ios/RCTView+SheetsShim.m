// RCTView+SheetsShim.m
#import <UIKit/UIKit.h>
#import "React/RCTView.h"

/**
 Shim para evitar crashes por setters de “sheets” que algunas libs
 envían a RCTView/UIView en builds de RN donde esos setters no existen.
 Definimos métodos vacíos en UIView (superclase) y también en RCTView.
*/

// ==== Categoría en UIView (cubre todas las subclases, incluido RCTView)
@implementation UIView (SheetsShim)

- (void)setSheetLargestUndimmedDetent:(id)value {}
- (void)setSheetAllowedDetents:(id)value {}
- (void)setSheetSelectedDetent:(id)value {}
- (void)setSheetDetents:(id)value {}
- (void)setSheetGrabberVisible:(id)value {}
- (void)setSheetCornerRadius:(id)value {}
- (void)setSheetPrefersEdgeAttached:(id)value {}
- (void)setSheetWidthFollowsPreferred:(id)value {}
- (void)setSheetPrefersScrollingExpandsWhenScrolledToEdge:(id)value {}

@end

// ==== Categoría en RCTView (por redundancia explícita)
@implementation RCTView (SheetsShim)

- (void)setSheetLargestUndimmedDetent:(id)value {}
- (void)setSheetAllowedDetents:(id)value {}
- (void)setSheetSelectedDetent:(id)value {}
- (void)setSheetDetents:(id)value {}
- (void)setSheetGrabberVisible:(id)value {}
- (void)setSheetCornerRadius:(id)value {}
- (void)setSheetPrefersEdgeAttached:(id)value {}
- (void)setSheetWidthFollowsPreferred:(id)value {}
- (void)setSheetPrefersScrollingExpandsWhenScrolledToEdge:(id)value {}

@end
