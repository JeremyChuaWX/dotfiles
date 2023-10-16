return {
    s(
        "iferr",
        fmt(
            [[
if err != nil {{
    {}
}}
            ]],
            { i(1, "return err") }
        )
    ),
}
