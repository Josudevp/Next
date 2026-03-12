import { useEffect } from 'react'

const SITE_URL = 'https://next-frontend.onrender.com'
const DEFAULT_TITLE = 'Next Job Hunter | IA para CV, entrevistas y primer empleo'
const DEFAULT_DESCRIPTION = 'Next Job Hunter es la plataforma de IA para mejorar tu CV, practicar entrevistas y acelerar tu primer empleo.'
const DEFAULT_IMAGE = `${SITE_URL}/next-og.svg`

const upsertMeta = (attribute, key, content) => {
    if (!content) return

    let element = document.head.querySelector(`meta[${attribute}="${key}"]`)
    if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attribute, key)
        document.head.appendChild(element)
    }

    element.setAttribute('content', content)
}

const upsertLink = (rel, href) => {
    if (!href) return

    let element = document.head.querySelector(`link[rel="${rel}"]`)
    if (!element) {
        element = document.createElement('link')
        element.setAttribute('rel', rel)
        document.head.appendChild(element)
    }

    element.setAttribute('href', href)
}

const Seo = ({
    title = DEFAULT_TITLE,
    description = DEFAULT_DESCRIPTION,
    keywords,
    path = '/',
    image = DEFAULT_IMAGE,
    robots = 'index, follow',
    type = 'website',
    structuredData,
}) => {
    useEffect(() => {
        const canonicalUrl = new URL(path, SITE_URL).toString()
        const scriptId = 'next-seo-structured-data'

        document.title = title

        upsertMeta('name', 'description', description)
        upsertMeta('name', 'keywords', keywords)
        upsertMeta('name', 'robots', robots)
        upsertMeta('name', 'author', 'Josue Molina, Nataly Piedrahita')
        upsertMeta('name', 'theme-color', '#2563EB')

        upsertMeta('property', 'og:type', type)
        upsertMeta('property', 'og:url', canonicalUrl)
        upsertMeta('property', 'og:title', title)
        upsertMeta('property', 'og:description', description)
        upsertMeta('property', 'og:image', image)
        upsertMeta('property', 'og:site_name', 'Next Job Hunter')
        upsertMeta('property', 'og:locale', 'es_CO')

        upsertMeta('name', 'twitter:card', 'summary_large_image')
        upsertMeta('name', 'twitter:title', title)
        upsertMeta('name', 'twitter:description', description)
        upsertMeta('name', 'twitter:image', image)

        upsertLink('canonical', canonicalUrl)

        const previousScript = document.getElementById(scriptId)
        if (previousScript) {
            previousScript.remove()
        }

        if (structuredData) {
            const script = document.createElement('script')
            script.id = scriptId
            script.type = 'application/ld+json'
            script.textContent = JSON.stringify(structuredData)
            document.head.appendChild(script)
        }

        return () => {
            if (!structuredData) return

            const script = document.getElementById(scriptId)
            if (script) {
                script.remove()
            }
        }
    }, [description, image, keywords, path, robots, structuredData, title, type])

    return null
}

export default Seo