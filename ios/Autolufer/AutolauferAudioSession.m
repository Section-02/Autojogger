#import <AVFoundation/AVFoundation.h>
#import <React/RCTEventEmitter.h>

@interface AutolauferAudioSession : RCTEventEmitter <RCTBridgeModule>
@end

@implementation AutolauferAudioSession

RCT_EXPORT_MODULE();

- (instancetype)init {
  self = [super init];
  if (self) {
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(audioSessionInterrupted:)
                                                 name:AVAudioSessionInterruptionNotification
                                               object:[AVAudioSession sharedInstance]];
  }
  return self;
}

- (NSArray<NSString *> *)supportedEvents {
  return @[@"AutolauferAudioInterruption"];
}

RCT_EXPORT_METHOD(startWorkoutAudio:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  AVAudioSession *session = [AVAudioSession sharedInstance];
  NSError *error = nil;
  [session setCategory:AVAudioSessionCategoryPlayback
                  mode:AVAudioSessionModeSpokenAudio
               options:AVAudioSessionCategoryOptionDuckOthers
                 error:&error];
  if (error) {
    reject(@"audio_session", @"Unable to configure workout audio.", error);
    return;
  }
  [session setActive:YES error:&error];
  if (error) {
    reject(@"audio_session", @"Unable to activate workout audio.", error);
    return;
  }
  resolve(@YES);
}

RCT_EXPORT_METHOD(stopWorkoutAudio:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  NSError *error = nil;
  [[AVAudioSession sharedInstance] setActive:NO
                                withOptions:AVAudioSessionSetActiveOptionNotifyOthersOnDeactivation
                                      error:&error];
  if (error) {
    reject(@"audio_session", @"Unable to stop workout audio.", error);
    return;
  }
  resolve(@YES);
}

- (void)audioSessionInterrupted:(NSNotification *)notification {
  NSNumber *type = notification.userInfo[AVAudioSessionInterruptionTypeKey];
  if (!type) return;
  NSString *event = type.integerValue == AVAudioSessionInterruptionTypeBegan ? @"began" : @"ended";
  [self sendEventWithName:@"AutolauferAudioInterruption" body:@{ @"type": event }];
}

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

@end
