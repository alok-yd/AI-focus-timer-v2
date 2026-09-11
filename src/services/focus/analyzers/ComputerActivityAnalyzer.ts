import { ActivityData, FocusEngineSettings, StudyMedium } from '../../../types';

export interface ComputerActivityAnalysisResult {
  keyboardActive: boolean;
  mouseActive: boolean;
  idleSeconds: number;
  activeApp: string;
  appCategory: 'STUDY' | 'NEUTRAL' | 'DISTRACTION';
  isDistractionApp: boolean;
  isStudyApp: boolean;
  activityScore: number;
  appScore: number;
  reason?: string;
}

export class ComputerActivityAnalyzer {
  analyze(
    activity: ActivityData,
    settings: FocusEngineSettings,
    medium: StudyMedium
  ): ComputerActivityAnalysisResult {
    const { keyboardActive, mouseActive, idleSeconds, activeApp } = activity;
    const isInputActive = keyboardActive || mouseActive;

    // Classify app
    let appCategory: 'STUDY' | 'NEUTRAL' | 'DISTRACTION' = 'NEUTRAL';
    let isDistractionApp = false;
    let isStudyApp = false;

    if (settings.enableWindowContext) {
      const appLower = (activeApp || '').toLowerCase();
      isDistractionApp = settings.distractingApps.some(a => appLower.includes(a.toLowerCase()));
      isStudyApp = settings.studyApps.some(a => appLower.includes(a.toLowerCase()));

      if (isDistractionApp) {
        appCategory = 'DISTRACTION';
      } else if (isStudyApp) {
        appCategory = 'STUDY';
      }
    }

    // App context score (0 to 100)
    let appScore = 80;
    let reason: string | undefined;

    if (isDistractionApp) {
      appScore = 15;
      reason = `Distraction application active in foreground (${activeApp})`;
    } else if (isStudyApp) {
      appScore = 100;
    }

    // Computer input activity score (0 to 100)
    // CRITICAL: In Paper / PYQ Study and Mixed Study, keyboard and mouse are NEVER required!
    let activityScore = 75;
    if (isInputActive) {
      activityScore = isDistractionApp ? 30 : 95;
    } else {
      if (medium === 'Paper / PYQ Study' || medium === 'Mixed Study') {
        // Zero penalty for sitting at paper desk with still mouse
        activityScore = 85;
      } else {
        // Screen study mode
        if (idleSeconds > 300) {
          activityScore = 60;
        } else {
          activityScore = 80;
        }
      }
    }

    return {
      keyboardActive,
      mouseActive,
      idleSeconds,
      activeApp,
      appCategory,
      isDistractionApp,
      isStudyApp,
      activityScore,
      appScore,
      reason
    };
  }
}

export const computerActivityAnalyzer = new ComputerActivityAnalyzer();
