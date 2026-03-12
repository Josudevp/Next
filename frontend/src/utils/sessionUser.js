const SESSION_USER_EVENT = 'next:user-updated'

export const getStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem('next_user') || 'null')
    } catch {
        return null
    }
}

export const setStoredUser = (user) => {
    if (!user) return null

    localStorage.setItem('next_user', JSON.stringify(user))
    window.dispatchEvent(new CustomEvent(SESSION_USER_EVENT, { detail: user }))
    return user
}

export const mergeStoredUser = (partialUser) => {
    const currentUser = getStoredUser() || {}
    return setStoredUser({ ...currentUser, ...partialUser })
}

export const SESSION_USER_UPDATED_EVENT = SESSION_USER_EVENT