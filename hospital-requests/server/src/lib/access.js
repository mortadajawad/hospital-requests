// Who can see and handle which requests.
// ADMIN: everything. STAFF: requests in their categories (plus ones they sent or are assigned to). REQUESTER: own requests.

export function requestScope(user) {
  if (user.role === 'ADMIN') return {};
  if (user.role === 'STAFF') {
    return { OR: [{ categoryId: { in: user.categoryIds } }, { requesterId: user.id }, { assigneeId: user.id }] };
  }
  return { requesterId: user.id };
}

// Can work on the request (change status, internal notes)
export function canHandle(user, request) {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'STAFF') return user.categoryIds.includes(request.categoryId) || request.assigneeId === user.id;
  return false;
}

export function canView(user, request) {
  return canHandle(user, request) || request.requesterId === user.id;
}

// Same rule as requestScope, as a SQL fragment (all values are integers from the database)
export function sqlScope(user) {
  if (user.role === 'ADMIN') return 'TRUE';
  const me = Number(user.id);
  if (user.role === 'STAFF') {
    const ids = user.categoryIds.map(Number).filter(Number.isInteger).join(',') || '-1';
    return `("categoryId" IN (${ids}) OR "requesterId" = ${me} OR "assigneeId" = ${me})`;
  }
  return `"requesterId" = ${me}`;
}
