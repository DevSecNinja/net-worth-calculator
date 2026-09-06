# UI Contract: Chart Details

## Visual tooltip

- Pointer hover and supported touch selection activate the datum nearest the interaction.
- The detail surface exposes a localized title and compact ordered label/value rows.
- The surface uses application theme tokens, wraps long labels, has a viewport-bounded width, and does not accept pointer events.
- Monetary values use canonical strings, vault currency, and selected locale.
- Percentages use selected-locale conventions and at most two meaningful decimal places.

## Chart-specific facts

| Chart                  | Required facts                                                           |
| ---------------------- | ------------------------------------------------------------------------ |
| Allocation             | category, value, displayed-total percentage, observation date            |
| Net-worth trend        | year, assets, liabilities, net worth, completeness and supported sources |
| Assets and liabilities | year, assets, liabilities, derived net worth, debt source                |
| Annual change          | year, signed amount, percentage or localized unavailable value           |
| Liability payoff       | liability name, year/date, remaining balance, source and status          |
| Exact timeline         | date, assets, liabilities, net worth, completeness and supported sources |

## Accessible fallback

- Each chart frame provides concise localized instructions.
- The full semantic table remains available by keyboard and assistive technology.
- Any selected-detail region uses non-interrupting semantics and must not repeatedly announce pointer movement.
- Visible chart SVG remains excluded from the accessibility tree unless it can offer semantics equivalent to the table.

## Privacy

- Detail state is transient component state.
- Rendering performs no network, persistence, URL, logging, cache, or unsafe-HTML operation.
