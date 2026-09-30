export default async function handler(req, res) {

    try {

        const [
            nasa,
            python,
            anime
        ] = await Promise.allSettled([

            getNASA(),
            getPython(),
            getAnime()

        ]);


        const updates = [];


        // ==========================================
        // NASA
        // ==========================================

        if (nasa.status === "fulfilled") {

            updates.push(...nasa.value);
        }


        // ==========================================
        // PYTHON
        // ==========================================

        if (python.status === "fulfilled") {

            updates.push(...python.value);
        }


        // ==========================================
        // ANIME
        // ==========================================

        if (anime.status === "fulfilled") {

            updates.push(...anime.value);
        }


        // ==========================================
        // STUDY
        // ==========================================

        updates.push(...getStudyUpdates());


        // newest first

        updates.sort((a, b) => {

            return new Date(b.date) - new Date(a.date);

        });


        res.status(200).json({

            success: true,

            updatedAt: new Date().toISOString(),

            updates

        });


    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            error: "Failed to retrieve live updates."

        });

    }

}



// ==================================================
// NASA
// ==================================================

async function getNASA() {

    const url =
        "https://science.nasa.gov/wp-json/wp/v2/apod-basic/?api_key=DEMO_KEY";


    const response = await fetch(url, {

        headers: {
            "Accept": "application/json"
        }

    });


    if (!response.ok) {

        throw new Error(
            `NASA API error: ${response.status}`
        );

    }


    const data = await response.json();


    const items = Array.isArray(data)
        ? data
        : [data];


    return items.slice(0, 5).map(item => {

        return {

            category: "nasa",

            title:
                item.title ||
                "NASA Update",

            description:
                item.explanation ||
                "Latest NASA astronomy update.",

            source:
                "NASA",

            date:
                item.date ||
                new Date().toISOString(),

            url:
                item.permalink ||
                item.url ||
                "https://www.nasa.gov/"

        };

    });

}



// ==================================================
// PYTHON
// ==================================================

async function getPython() {

    const response = await fetch(
        "https://blog.python.org/rss.xml",
        {
            headers: {
                "Accept": "application/rss+xml, application/xml, text/xml"
            }
        }
    );


    if (!response.ok) {

        throw new Error(
            `Python feed error: ${response.status}`
        );

    }


    const xml = await response.text();


    const items = extractRSSItems(xml);


    return items.slice(0, 6).map(item => {

        return {

            category: "python",

            title:
                item.title ||
                "Python Update",

            description:
                cleanHTML(item.description)
                    .slice(0, 300) ||
                "Latest Python development news.",

            source:
                "Python Insider",

            date:
                item.date ||
                new Date().toISOString(),

            url:
                item.url ||
                "https://blog.python.org/"

        };

    });

}



// ==================================================
// ANIME
// ==================================================

async function getAnime() {

    const query = `

        query {

            Page(
                page: 1
                perPage: 8
            ) {

                media(
                    type: ANIME
                    status: RELEASING
                    sort: UPDATED_AT_DESC
                ) {

                    id

                    title {
                        romaji
                        english
                    }

                    description

                    episodes

                    nextAiringEpisode {
                        airingAt
                        episode
                    }

                    siteUrl

                }

            }

        }

    `;


    const response = await fetch(
        "https://graphql.anilist.co",
        {

            method: "POST",

            headers: {

                "Content-Type":
                    "application/json",

                "Accept":
                    "application/json"

            },

            body: JSON.stringify({
                query
            })

        }
    );


    if (!response.ok) {

        throw new Error(
            `AniList error: ${response.status}`
        );

    }


    const data = await response.json();


    const media =
        data?.data?.Page?.media || [];


    return media.map(anime => {

        const title =
            anime.title?.english ||
            anime.title?.romaji ||
            "Unknown Anime";


        let description =
            anime.description || "";


        description = cleanHTML(description);


        if (anime.nextAiringEpisode) {

            const episode =
                anime.nextAiringEpisode.episode;

            const airingDate =
                new Date(
                    anime.nextAiringEpisode.airingAt * 1000
                );


            description =
                `Episode ${episode} airs ${airingDate.toLocaleString()}. ` +
                description;

        }


        return {

            category: "anime",

            title,

            description:
                description.slice(0, 300) ||
                "Currently airing anime update.",

            source:
                "AniList",

            date:
                anime.nextAiringEpisode
                    ? new Date(
                        anime.nextAiringEpisode.airingAt * 1000
                    ).toISOString()
                    : new Date().toISOString(),

            url:
                anime.siteUrl ||
                "https://anilist.co/"

        };

    });

}



// ==================================================
// STUDY
// ==================================================

function getStudyUpdates() {

    const now = new Date();


    const courses = [

        {
            code: "INS 203",
            name: "System Analysis and Design"
        },

        {
            code: "IFT 211",
            name: "Digital Logic Design"
        },

        {
            code: "COS 201",
            name: "Computer Programming I"
        },

        {
            code: "CSC 203",
            name: "Discrete Structures"
        },

        {
            code: "MTH 201",
            name: "Mathematical Method I"
        },

        {
            code: "ENT 211",
            name: "Entrepreneurship and Innovation"
        },

        {
            code: "SEN 205",
            name: "Software Testing and Quality Assurance"
        },

        {
            code: "SEN 201",
            name: "Introduction to Software Engineering"
        },

        {
            code: "SEN 203",
            name: "Software Engineering Process"
        }

    ];


    return courses.map((course, index) => {

        return {

            category: "study",

            title:
                `${course.code} — ${course.name}`,

            description:
                `Course tracking active. ` +
                `Use the academic dashboard to monitor ` +
                `your timetable, upcoming classes and study progress.`,

            source:
                "REX Academic System",

            date:
                new Date(
                    now.getTime() - index * 60000
                ).toISOString(),

            url:
                "/"

        };

    });

}



// ==================================================
// RSS PARSER
// ==================================================

function extractRSSItems(xml) {

    const items = [];


    const matches =
        xml.match(/<item[\s\S]*?<\/item>/gi) || [];


    for (const block of matches) {

        const title =
            extractTag(block, "title");


        const description =
            extractTag(block, "description");


        const url =
            extractTag(block, "link");


        const date =
            extractTag(block, "pubDate");


        items.push({

            title: decodeXML(title),

            description: decodeXML(description),

            url: decodeXML(url),

            date: decodeXML(date)

        });

    }


    return items;

}



function extractTag(xml, tag) {

    const regex =
        new RegExp(
            `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
            "i"
        );


    const match =
        xml.match(regex);


    return match
        ? match[1].trim()
        : "";

}



// ==================================================
// CLEANING
// ==================================================

function cleanHTML(text) {

    return String(text || "")

        .replace(
            /<script[\s\S]*?<\/script>/gi,
            ""
        )

        .replace(
            /<style[\s\S]*?<\/style>/gi,
            ""
        )

        .replace(
            /<[^>]+>/g,
            " "
        )

        .replace(
            /\s+/g,
            " "
        )

        .trim();

}



function decodeXML(text) {

    return String(text || "")

        .replace(
            /<!\[CDATA\[([\s\S]*?)\]\]>/g,
            "$1"
        )

        .replace(
            /&amp;/g,
            "&"
        )

        .replace(
            /&quot;/g,
            '"'
        )

        .replace(
            /&#39;/g,
            "'"
        )

        .replace(
            /&apos;/g,
            "'"
        )

        .replace(
            /&lt;/g,
            "<"
        )

        .replace(
            /&gt;/g,
            ">"

        );

}
