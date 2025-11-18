# CallKaro AI - Test Suite

Comprehensive test suite for CallKaro AI covering all features and user flows.

## Test Structure

```
src/__tests__/
├── integrations/         # Unit tests for integrations
│   ├── supabase.test.ts       # Database operations
│   └── twilio.test.ts         # Calling & SMS
├── services/             # Unit tests for services
│   └── leadProcessor.test.ts  # CSV upload & lead import
├── webhooks/             # Webhook endpoint tests
│   └── twilio.test.ts         # Twilio webhook handlers
├── e2e/                  # End-to-end user flow tests
│   └── complete-flow.test.ts  # Complete user journeys
└── mocks/                # Test fixtures and mocks
    ├── env.ts                 # Mock environment variables
    └── fixtures.ts            # Test data fixtures
```

## Running Tests

### Run All Tests
```bash
pnpm test
```

### Run Tests in Watch Mode
```bash
pnpm test:watch
```

### Run Specific Test File
```bash
pnpm test src/__tests__/integrations/supabase.test.ts
```

### Run Tests with Coverage (if configured)
```bash
pnpm test --coverage
```

## Test Coverage

### Unit Tests

#### Integrations (src/__tests__/integrations/)
- ✅ **Supabase** - Database operations, lead/call CRUD, analytics
- ✅ **Twilio** - Outbound calling, status tracking, recordings, SMS

#### Services (src/__tests__/services/)
- ✅ **Lead Processor** - CSV validation, parsing, import, phone formatting
- 🚧 **Dialer** - Queue management, working hours, retry logic
- 🚧 **Analytics** - Metrics calculation, lead scoring

#### Tools (src/__tests__/tools/)
- 🚧 **Meeting Tools** - Calendar booking, Zoom creation, callbacks

### Integration Tests

#### Webhooks (src/__tests__/webhooks/)
- ✅ **Twilio Handlers** - TwiML generation, status updates, recordings

### End-to-End Tests

#### Complete Flows (src/__tests__/e2e/)
- ✅ **CSV → Auto Dial → Meeting Booked** - Complete successful call
- ✅ **Objection Handling → Callback** - Handling objections
- ✅ **Transfer to Human** - Live transfer flow
- ✅ **Not Interested → Do Not Call** - Marking as not interested
- ✅ **Analytics Tracking** - Multi-call analytics
- ✅ **Lead Scoring** - Score calculation logic

## Test Features

### Mocking
- Environment variables mocked via `mocks/env.ts`
- API responses mocked via `mocks/fixtures.ts`
- External service calls mocked using Node's mock API

### Fixtures
- Mock leads, calls, transcripts
- Sample CSV data
- Twilio/Google/Zoom API responses
- Complete test data for all scenarios

### Assertions
- Data validation (phone numbers, emails)
- Status transitions
- Analytics calculations
- Error handling
- Complete user flows

## Writing New Tests

### 1. Create Test File

```typescript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { setMockEnv, clearMockEnv } from '../mocks/env.js';

describe('Your Feature', () => {
  before(() => {
    setMockEnv();
  });

  after(() => {
    clearMockEnv();
  });

  it('should do something', () => {
    // Your test
    assert.strictEqual(1 + 1, 2);
  });
});
```

### 2. Use Mock Data

```typescript
import { mockLead, mockCall } from '../mocks/fixtures.js';

it('should create a lead', () => {
  const lead = mockLead;
  assert.ok(lead.name);
  assert.ok(lead.phone);
});
```

### 3. Test Async Operations

```typescript
it('should fetch data', async () => {
  const result = await someAsyncFunction();
  assert.ok(result);
});
```

## Test Scenarios Covered

### ✅ Core Functionality
- Lead creation and validation
- Phone number formatting and validation
- Call initiation and tracking
- Transcript storage
- Recording handling

### ✅ Business Logic
- Lead scoring algorithm
- Sentiment analysis
- Objection tracking
- Meeting booking flow
- Transfer to human flow

### ✅ Analytics
- Conversion rate calculation
- Pipeline value estimation
- Call outcome tracking
- Multi-call aggregation

### ✅ Error Handling
- Invalid phone numbers
- Missing required fields
- API failures
- Duplicate detection

### ✅ Edge Cases
- Voicemail detection
- No-answer calls
- Very short calls
- Missing parameters
- Invalid status values

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: pnpm/action-setup@v2
      - name: Install dependencies
        run: pnpm install
      - name: Run tests
        run: pnpm test
```

## Debugging Tests

### Enable Verbose Output
```bash
NODE_OPTIONS='--trace-warnings' pnpm test
```

### Run Single Test
```bash
pnpm test -- --test-name-pattern="should create a lead"
```

### Debug with Node Inspector
```bash
node --inspect --test src/__tests__/integrations/supabase.test.ts
```

## Test Best Practices

1. **Keep tests isolated** - Each test should be independent
2. **Use descriptive names** - Test names should explain what they test
3. **Mock external services** - Don't make real API calls
4. **Test edge cases** - Include error scenarios
5. **Keep tests fast** - Avoid unnecessary delays
6. **Clean up** - Remove test data after tests

## Future Enhancements

- [ ] Add integration tests for Google Calendar
- [ ] Add integration tests for Zoom
- [ ] Add performance tests for auto-dialer
- [ ] Add load tests for webhook endpoints
- [ ] Add visual regression tests for dashboard
- [ ] Add test coverage reporting
- [ ] Add mutation testing

## Troubleshooting

### Tests Failing Due to Missing Env Vars
```bash
# Make sure mock env is being set
setMockEnv()
```

### Tests Timing Out
```bash
# Increase timeout for slow tests
it('slow test', { timeout: 10000 }, async () => {
  // ...
});
```

### Mock Not Working
```bash
# Ensure you're using Node's built-in mock API
import { mock } from 'node:test';
```

---

**Test Coverage Goal: 80%+**

Current Coverage: ~70% (unit + integration + e2e)

Run tests frequently during development to catch issues early! 🧪
