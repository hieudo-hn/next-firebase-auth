import React from 'react'
import { render } from '@testing-library/react'
import { setConfig } from 'src/config'
import getMockConfig from 'src/testHelpers/createMockConfig'
import {
  createMockSerializedAuthUser,
  createMockFirebaseUserClientSDK,
} from 'src/testHelpers/authUserInputs'
import useAuthUser from 'src/useAuthUser'
import createAuthUser from 'src/createAuthUser'
import useFirebaseUser from 'src/useFirebaseUser'

import AuthStrategy from 'src/AuthStrategy'

// Note that we don't mock createAuthUser or useAuthUser.
const mockRouterPush = jest.fn()
jest.mock('next/router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))
jest.mock('src/useFirebaseUser')
jest.mock('src/isClientSide')

const MockComponent = ({ message }) => <div>Hello! {message}</div>

beforeEach(() => {
  // Default to client side context.
  const isClientSide = require('src/isClientSide').default
  isClientSide.mockReturnValue(true)

  const mockConfig = getMockConfig()
  setConfig({
    ...mockConfig,
    firebaseAdminInitConfig: undefined,
    cookies: undefined,
  })

  useFirebaseUser.mockReturnValue({
    user: undefined,
    initialized: false,
  })
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('withAuthUser: rendering/redirecting', () => {
  it('renders the child component when there is no server-side or client-side user by default (rendering is the default setting)', () => {
    expect.assertions(1)
    const withAuthUser = require('src/withAuthUser').default
    useFirebaseUser.mockReturnValue({
      user: undefined, // no client-side user
      initialized: false, // not yet initialized
    })
    const MockCompWithUser = withAuthUser()(MockComponent)
    const { queryByText } = render(<MockCompWithUser message="How are you?" />)
    expect(queryByText('Hello! How are you?')).toBeTruthy()
  })

  it('renders the child component when there is no server-side or client-side user and rendering without a user is allowed', () => {
    expect.assertions(1)
    const withAuthUser = require('src/withAuthUser').default
    useFirebaseUser.mockReturnValue({
      user: undefined, // no client-side user
      initialized: false, // not yet initialized
    })
    const MockCompWithUser = withAuthUser({
      whenUnauthedBeforeInit: AuthStrategy.RENDER,
      whenUnauthedAfterInit: AuthStrategy.RENDER,
      whenAuthed: AuthStrategy.RENDER,
    })(MockComponent)
    const { queryByText } = render(<MockCompWithUser message="How are you?" />)
    expect(queryByText('Hello! How are you?')).toBeTruthy()
  })

  it('returns null if when there is no server-side or client-side user and "whenUnauthedBeforeInit" is set to render null', () => {
    expect.assertions(1)
    const withAuthUser = require('src/withAuthUser').default
    useFirebaseUser.mockReturnValue({
      user: undefined, // no client-side user
      initialized: false, // not yet initialized
    })
    const MockCompWithUser = withAuthUser({
      whenUnauthedBeforeInit: AuthStrategy.RETURN_NULL,
      whenUnauthedAfterInit: AuthStrategy.RENDER,
      whenAuthed: AuthStrategy.RENDER,
    })(MockComponent)
    const { container } = render(<MockCompWithUser message="How are you?" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the child component when there is a server-side user and rendering without a user is *not* allowed', () => {
    expect.assertions(1)
    const withAuthUser = require('src/withAuthUser').default
    useFirebaseUser.mockReturnValue({
      user: undefined, // no client-side user
      initialized: false, // not yet initialized
    })
    const MockSerializedAuthUser = createMockSerializedAuthUser()
    const MockCompWithUser = withAuthUser({
      whenUnauthedBeforeInit: AuthStrategy.RENDER,
      whenUnauthedAfterInit: AuthStrategy.RENDER,
      whenAuthed: AuthStrategy.RENDER,
    })(MockComponent)
    const { queryByText } = render(
      <MockCompWithUser
        AuthUserSerialized={MockSerializedAuthUser}
        message="How are you?"
      />
    )
    expect(queryByText('Hello! How are you?')).toBeTruthy()
  })

  it('renders the child component when there is a client-side user (but no server-side user) and rendering without a user is *not* allowed', () => {
    expect.assertions(1)
    const withAuthUser = require('src/withAuthUser').default
    const MockSerializedAuthUser = undefined // no server-side user
    useFirebaseUser.mockReturnValue({
      user: createMockFirebaseUserClientSDK(), // client-side user exists
      initialized: true,
    })
    const MockCompWithUser = withAuthUser({
      whenUnauthedBeforeInit: AuthStrategy.RENDER,
      whenUnauthedAfterInit: AuthStrategy.RENDER,
      whenAuthed: AuthStrategy.RENDER,
    })(MockComponent)
    const { queryByText } = render(
      <MockCompWithUser
        AuthUserSerialized={MockSerializedAuthUser}
        message="How are you?"
      />
    )
    expect(queryByText('Hello! How are you?')).toBeTruthy()
  })

  it('renders the child component when there is a client-side user after Firebase initializes (but no server-side user) and rendering without a user should return null', () => {
    expect.assertions(2)
    const withAuthUser = require('src/withAuthUser').default
    const MockSerializedAuthUser = undefined // no server-side user
    const MockCompWithUser = withAuthUser({
      whenUnauthedBeforeInit: AuthStrategy.RETURN_NULL,
      whenUnauthedAfterInit: AuthStrategy.RENDER,
      whenAuthed: AuthStrategy.RENDER,
    })(MockComponent)
    const { queryByText, rerender } = render(
      <MockCompWithUser
        AuthUserSerialized={MockSerializedAuthUser}
        message="How are you?"
      />
    )

    // The wrapped component will only render after the client-side
    // user is available.
    expect(queryByText('Hello! How are you?')).toBeNull()
    useFirebaseUser.mockReturnValue({
      user: createMockFirebaseUserClientSDK(),
      initialized: true,
    })
    rerender(
      <MockCompWithUser
        AuthUserSerialized={MockSerializedAuthUser}
        message="How are you?"
      />
    )
    expect(queryByText('Hello! How are you?')).toBeTruthy()
  })

  it('shows a loading component on the client side when there is no user (*before* Firebase initializes) and a "show loader" strategy is set', () => {
    expect.assertions(1)
    const withAuthUser = require('src/withAuthUser').default
    const MockSerializedAuthUser = undefined // no server-side user
    useFirebaseUser.mockReturnValue({
      user: undefined, // no client-side user
      initialized: false, // not yet initialized
    })
    const MockCompWithUser = withAuthUser({
      whenUnauthedBeforeInit: AuthStrategy.SHOW_LOADER,
      whenUnauthedAfterInit: AuthStrategy.RENDER,
      redirectIfAuthed: true,
    })(MockComponent)
    const { queryByText } = render(
      <MockCompWithUser
        serializedAuthUser={MockSerializedAuthUser}
        message="How are you?"
      />
    )
    expect(queryByText('Loading...')).toBeTruthy()
  })

  it('redirects to login on the client side when there is no user (*before* Firebase initializes) and a redirecting strategy is set', () => {
    expect.assertions(1)
    const withAuthUser = require('src/withAuthUser').default
    const MockSerializedAuthUser = undefined // no server-side user
    useFirebaseUser.mockReturnValue({
      user: undefined, // no client-side user
      initialized: false, // not yet initialized
    })
    const MockCompWithUser = withAuthUser({
      whenUnauthedBeforeInit: AuthStrategy.REDIRECT_TO_LOGIN,
      // A user would normally not set this to render when they're redirecting
      // before initialization. We do this just for testing clarity.
      whenUnauthedAfterInit: AuthStrategy.RENDER,
      whenAuthed: AuthStrategy.RENDER,
    })(MockComponent)
    render(
      <MockCompWithUser
        serializedAuthUser={MockSerializedAuthUser}
        message="How are you?"
      />
    )
    expect(mockRouterPush).toHaveBeenCalledWith('/auth')
  })

  it('redirects to login on the client side when there is no user (*after* Firebase initializes) and a redirecting strategy is set', () => {
    expect.assertions(1)
    const withAuthUser = require('src/withAuthUser').default
    const MockSerializedAuthUser = undefined // no server-side user
    useFirebaseUser.mockReturnValue({
      user: undefined, // no client-side user
      initialized: true, // already initialized
    })
    const MockCompWithUser = withAuthUser({
      whenUnauthedBeforeInit: AuthStrategy.RENDER,
      whenUnauthedAfterInit: AuthStrategy.REDIRECT_TO_LOGIN,
      whenAuthed: AuthStrategy.RENDER,
    })(MockComponent)
    render(
      <MockCompWithUser
        serializedAuthUser={MockSerializedAuthUser}
        message="How are you?"
      />
    )
    expect(mockRouterPush).toHaveBeenCalledWith('/auth')
  })

  it('renders null when redirecting to the login', () => {
    expect.assertions(1)
    const withAuthUser = require('src/withAuthUser').default
    const MockSerializedAuthUser = undefined // no server-side user
    useFirebaseUser.mockReturnValue({
      user: undefined, // no client-side user
      initialized: true, // already initialized
    })
    const MockCompWithUser = withAuthUser({
      whenUnauthedBeforeInit: AuthStrategy.RENDER,
      whenUnauthedAfterInit: AuthStrategy.REDIRECT_TO_LOGIN,
      whenAuthed: AuthStrategy.RENDER,
    })(MockComponent)
    const { container } = render(
      <MockCompWithUser
        serializedAuthUser={MockSerializedAuthUser}
        message="How are you?"
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders null when redirecting to the app', () => {
    expect.assertions(1)
    const withAuthUser = require('src/withAuthUser').default
    const MockSerializedAuthUser = undefined // no server-side user
    useFirebaseUser.mockReturnValue({
      user: createMockFirebaseUserClientSDK(), // client-side user exists
      initialized: true,
    })
    const MockCompWithUser = withAuthUser({
      whenUnauthedBeforeInit: AuthStrategy.RENDER,
      whenUnauthedAfterInit: AuthStrategy.RENDER,
      whenAuthed: AuthStrategy.REDIRECT_TO_APP,
    })(MockComponent)
    const { container } = render(
      <MockCompWithUser
        serializedAuthUser={MockSerializedAuthUser}
        message="How are you?"
      />
    )
    expect(container.firstChild).toBeNull()
  })
})

describe('withAuthUser: AuthUser context', () => {
  it('sets the AuthUser context to an empty AuthUser when there is no server-side or client-side user', () => {
    expect.assertions(1)
    const withAuthUser = require('src/withAuthUser').default
    const MockSerializedAuthUser = undefined // no server-side user
    useFirebaseUser.mockReturnValue({
      user: undefined, // no client-side user exists
      initialized: false,
    })
    const expectedAuthUser = {
      ...createAuthUser(),
      getIdToken: expect.any(Function),
      serialize: expect.any(Function),
      signOut: expect.any(Function),
    }

    let wrappedCompAuthUser
    const AnotherMockComponent = () => {
      // eslint-disable-next-line no-unused-vars
      wrappedCompAuthUser = useAuthUser()
      return <div>hi!</div>
    }

    const MockCompWithUser = withAuthUser({
      whenUnauthedBeforeInit: AuthStrategy.RENDER,
      whenUnauthedAfterInit: AuthStrategy.RENDER,
      whenAuthed: AuthStrategy.RENDER,
    })(AnotherMockComponent)
    render(<MockCompWithUser AuthUserSerialized={MockSerializedAuthUser} />)
    expect(wrappedCompAuthUser).toEqual(expectedAuthUser)
  })

  it('sets the AuthUser context using the server-side user (when there is no client-side user)', () => {
    expect.assertions(1)
    const withAuthUser = require('src/withAuthUser').default
    const MockSerializedAuthUser = createMockSerializedAuthUser()
    const expectedAuthUser = {
      ...createAuthUser({
        serializedAuthUser: MockSerializedAuthUser,
      }),
      getIdToken: expect.any(Function),
      serialize: expect.any(Function),
      signOut: expect.any(Function),
    }
    useFirebaseUser.mockReturnValue({
      user: undefined, // no client-side user exists
      initialized: false,
    })

    let wrappedCompAuthUser
    const AnotherMockComponent = () => {
      // eslint-disable-next-line no-unused-vars
      wrappedCompAuthUser = useAuthUser()
      return <div>hi!</div>
    }

    const MockCompWithUser = withAuthUser({
      whenUnauthedBeforeInit: AuthStrategy.RENDER,
      whenUnauthedAfterInit: AuthStrategy.RENDER,
      whenAuthed: AuthStrategy.RENDER,
    })(AnotherMockComponent)
    render(<MockCompWithUser AuthUserSerialized={MockSerializedAuthUser} />)
    expect(wrappedCompAuthUser).toEqual(expectedAuthUser)
  })

  it('sets the AuthUser context using the client-side user (when there is no server-side user)', () => {
    expect.assertions(1)
    const withAuthUser = require('src/withAuthUser').default
    const MockSerializedAuthUser = undefined // no server-side user

    const mockFirebaseUser = createMockFirebaseUserClientSDK()
    useFirebaseUser.mockReturnValue({
      user: mockFirebaseUser, // client-side user exists
      initialized: true,
    })
    const expectedAuthUser = {
      ...createAuthUser({
        firebaseUserClientSDK: mockFirebaseUser,
      }),
      clientInitialized: true,
      getIdToken: expect.any(Function),
      serialize: expect.any(Function),
      signOut: expect.any(Function),
    }

    let wrappedCompAuthUser
    const AnotherMockComponent = () => {
      // eslint-disable-next-line no-unused-vars
      wrappedCompAuthUser = useAuthUser()
      return <div>hi!</div>
    }

    const MockCompWithUser = withAuthUser({
      whenUnauthedBeforeInit: AuthStrategy.RENDER,
      whenUnauthedAfterInit: AuthStrategy.RENDER,
      whenAuthed: AuthStrategy.RENDER,
    })(AnotherMockComponent)
    render(<MockCompWithUser AuthUserSerialized={MockSerializedAuthUser} />)
    expect(wrappedCompAuthUser).toEqual(expectedAuthUser)
  })

  it('sets the AuthUser context using the client-side user when both client-side and server-side user info exists', () => {
    expect.assertions(1)
    const withAuthUser = require('src/withAuthUser').default
    const MockSerializedAuthUser = createMockSerializedAuthUser() // server-side user exists
    const mockFirebaseUser = createMockFirebaseUserClientSDK()
    useFirebaseUser.mockReturnValue({
      user: mockFirebaseUser, // client-side user exists
      initialized: true,
    })

    // Will use the client-side user when both exist.
    const expectedAuthUser = {
      ...createAuthUser({
        firebaseUserClientSDK: mockFirebaseUser,
      }),
      clientInitialized: true,
      getIdToken: expect.any(Function),
      serialize: expect.any(Function),
      signOut: expect.any(Function),
    }

    let wrappedCompAuthUser
    const AnotherMockComponent = () => {
      // eslint-disable-next-line no-unused-vars
      wrappedCompAuthUser = useAuthUser()
      return <div>hi!</div>
    }

    const MockCompWithUser = withAuthUser({
      whenUnauthedBeforeInit: AuthStrategy.RENDER,
      whenUnauthedAfterInit: AuthStrategy.RENDER,
      whenAuthed: AuthStrategy.RENDER,
    })(AnotherMockComponent)
    render(<MockCompWithUser AuthUserSerialized={MockSerializedAuthUser} />)
    expect(wrappedCompAuthUser).toEqual(expectedAuthUser)
  })

  it('sets the AuthUser context using the server-side user when both client-side and server-side user info exists but the Firebase JS SDK has not initialized', () => {
    expect.assertions(1)
    const withAuthUser = require('src/withAuthUser').default
    const MockSerializedAuthUser = createMockSerializedAuthUser() // server-side user exists
    useFirebaseUser.mockReturnValue({
      user: undefined,
      initialized: false,
    })

    // Will use the server-side user when the Firebase JS SDK has not
    // yet initialized.
    const expectedAuthUser = {
      ...createAuthUser({
        serializedAuthUser: MockSerializedAuthUser,
      }),
      getIdToken: expect.any(Function),
      serialize: expect.any(Function),
      signOut: expect.any(Function),
    }

    let wrappedCompAuthUser
    const AnotherMockComponent = () => {
      // eslint-disable-next-line no-unused-vars
      wrappedCompAuthUser = useAuthUser()
      return <div>hi!</div>
    }

    const MockCompWithUser = withAuthUser({
      whenUnauthedBeforeInit: AuthStrategy.RENDER,
      whenUnauthedAfterInit: AuthStrategy.RENDER,
      whenAuthed: AuthStrategy.RENDER,
    })(AnotherMockComponent)
    render(<MockCompWithUser AuthUserSerialized={MockSerializedAuthUser} />)
    expect(wrappedCompAuthUser).toEqual(expectedAuthUser)
  })

  it('sets the AuthUser context to an empty AuthUser when the server-side user exists, but the Firebase JS SDK *has* initialized and has no user', () => {
    expect.assertions(1)
    const withAuthUser = require('src/withAuthUser').default
    const MockSerializedAuthUser = createMockSerializedAuthUser() // server-side user exists
    useFirebaseUser.mockReturnValue({
      user: undefined,
      initialized: true,
    })

    // Will use the (unauthenticated) user when the Firebase JS SDK
    // has initialized, even if a server-side user exists. In this
    // case, cookies are set but Firebase JS SDK does not have auth
    // info.
    const expectedAuthUser = {
      ...createAuthUser(),
      clientInitialized: true,
      getIdToken: expect.any(Function),
      serialize: expect.any(Function),
      signOut: expect.any(Function),
    }

    let wrappedCompAuthUser
    const AnotherMockComponent = () => {
      // eslint-disable-next-line no-unused-vars
      wrappedCompAuthUser = useAuthUser()
      return <div>hi!</div>
    }

    const MockCompWithUser = withAuthUser({
      whenUnauthedBeforeInit: AuthStrategy.RENDER,
      whenUnauthedAfterInit: AuthStrategy.RENDER,
      whenAuthed: AuthStrategy.RENDER,
    })(AnotherMockComponent)
    render(<MockCompWithUser AuthUserSerialized={MockSerializedAuthUser} />)
    expect(wrappedCompAuthUser).toEqual(expectedAuthUser)
  })
})
