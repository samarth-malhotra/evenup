import { Expense, Group, User } from '@/types';
import { faker } from '@faker-js/faker';
import MockAdapter from 'axios-mock-adapter';

// small helper to generate sample data
function makeUser(id = 'u1'): User {
  return {
    id,
    name: faker.person.fullName(),
    avatarUrl: faker.image.avatar(),
    email: faker.internet.email(),
  } as unknown as User;
}

function makeGroup(id = 'g1'): Group {
  return {
    id,
    name: faker.lorem.words(2),
    members: [makeUser('u1'), makeUser('u2')],
    createdAt: new Date().toISOString(),
    // add fields from your types.ts if needed
  } as unknown as Group;
}

export function setupMocks(axiosInstance: any) {
  const mock = new MockAdapter(axiosInstance, { delayResponse: 400 }); // simulate latency

  // In-memory fixtures (simple db for mocks)
  const users: Record<string, User> = {
    u1: makeUser('u1'),
    u2: makeUser('u2'),
  };

  const groups: Record<string, Group> = {
    g1: makeGroup('g1'),
    g2: makeGroup('g2'),
  };

  const expenses: Record<string, Expense[]> = {
    g1: [
      {
        id: 'e1',
        groupId: 'g1',
        payerId: 'u1',
        amount: 120,
        description: 'Lunch',
        createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        // fill ExpenseShare etc per your types
      } as unknown as Expense,
    ],
    g2: [],
  };

  // Auth: login
  mock.onPost('/auth/login').reply((config) => {
    const body = JSON.parse(config.data || '{}');
    if (body.email && body.password) {
      // return token + user
      return [
        200,
        {
          token: 'mock-token-123',
          user: users.u1,
        },
      ];
    }
    return [400, { message: 'Missing credentials' }];
  });

  // GET /groups
  mock.onGet('/groups').reply(() => {
    return [200, Object.values(groups)];
  });

  // GET /groups/:id
  mock.onGet(new RegExp('^/groups/[^/]+$')).reply((config) => {
    const id = config.url!.split('/').pop()!;
    const group = groups[id];
    if (!group) return [404, { message: 'Group not found' }];
    // attach recent expenses count etc if needed
    return [200, group];
  });

  // GET /groups/:id/expenses
  mock.onGet(new RegExp('^/groups/[^/]+/expenses$')).reply((config) => {
    const parts = config.url!.split('/');
    const groupId = parts[2];
    return [200, expenses[groupId] || []];
  });
  // To test failed scenario, uncomment below code
  //   mock.onPost(new RegExp('^/groups/[^/]+/expenses$')).replyOnce(500, { message: 'Server error' });

  // POST /groups/:id/expenses
  mock.onPost(new RegExp('^/groups/[^/]+/expenses$')).reply((config) => {
    const parts = config.url!.split('/');
    const groupId = parts[2];
    const payload = JSON.parse(config.data || '{}');
    const id = `e-${Date.now()}`;
    const expense = {
      id,
      groupId,
      amount: payload.amount ?? 0,
      payerId: payload.payerId ?? 'u1',
      description: payload.description ?? '',
      createdAt: new Date().toISOString(),
      // fill rest as per your type
    } as unknown as Expense;

    expenses[groupId] = [expense, ...(expenses[groupId] || [])];

    // optionally update groups data
    // groups[groupId].lastActivity = expense.createdAt;

    return [201, expense];
  });

  // fallback to a generic 404 for unknown requests
  mock.onAny().reply((config) => {
    console.warn('[MOCK] no handler for', config.method, config.url);
    return [404, { message: 'Mock: endpoint not implemented' }];
  });

  // expose the mock for tests/debug if needed
  // (global as any).__axiosMock = mock;
}
