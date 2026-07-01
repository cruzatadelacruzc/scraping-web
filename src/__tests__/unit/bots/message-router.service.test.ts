import 'reflect-metadata';
import { MessageRouterService } from '@bots/services/message-router.service';

describe('MessageRouterService', () => {
  let service: MessageRouterService;
  const log = { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), context: '' } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MessageRouterService(log);
  });

  describe('route', () => {
    it('returns flow route for /alarms', () => {
      const result = service.route('/alarms');
      expect(result).toEqual({ target: 'flow', flow: 'alarms' });
    });

    it('returns flow route for /subscription', () => {
      const result = service.route('/subscription');
      expect(result).toEqual({ target: 'flow', flow: 'subscription' });
    });

    it('returns flow route for /profile', () => {
      const result = service.route('/profile');
      expect(result).toEqual({ target: 'flow', flow: 'profile' });
    });

    it('returns flow route for /help', () => {
      const result = service.route('/help');
      expect(result).toEqual({ target: 'flow', flow: 'help' });
    });

    it('returns flow route for /start', () => {
      const result = service.route('/start');
      expect(result).toEqual({ target: 'flow', flow: 'welcome' });
    });

    it('trims whitespace around the command', () => {
      const result = service.route('  /alarms  ');
      expect(result).toEqual({ target: 'flow', flow: 'alarms' });
    });

    it('returns ai route for free-form text', () => {
      const result = service.route('¿cuál es mi plan?');
      expect(result).toEqual({ target: 'ai' });
    });

    it('returns ai route for empty string', () => {
      const result = service.route('');
      expect(result).toEqual({ target: 'ai' });
    });

    it('returns ai route for non-command text starting with slash (e.g. a path)', () => {
      const result = service.route('/not-a-command');
      expect(result).toEqual({ target: 'ai' });
    });

    it('is case-insensitive for known commands', () => {
      const result = service.route('/ALARMS');
      expect(result).toEqual({ target: 'flow', flow: 'alarms' });
    });
  });
});
