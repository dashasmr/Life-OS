from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.crud import create_finance_transaction, finance_totals_in_range, list_finance_transactions
from app.database import get_db
from app.schemas import FinanceKind, FinanceRangeSummaryRead, FinanceTransactionCreate, FinanceTransactionRead

router = APIRouter(prefix="/finance", tags=["finance"])


@router.post("/transactions", response_model=FinanceTransactionRead, status_code=201)
def create_finance_transaction_endpoint(payload: FinanceTransactionCreate, db: Session = Depends(get_db)):
    return create_finance_transaction(db, payload)


@router.get("/summary/range", response_model=FinanceRangeSummaryRead)
def finance_summary_range_endpoint(
    db: Session = Depends(get_db),
    range_start: datetime = Query(..., alias="from"),
    range_end: datetime = Query(..., alias="to"),
):
    """
    Aggregate income and expenses for created_at in [from, to).
    Pass ISO-8601 datetimes (e.g. from the browser's local month boundaries as UTC instants).
    """
    if range_start >= range_end:
        raise HTTPException(status_code=422, detail="from must be before to")
    return finance_totals_in_range(db, range_start, range_end)


@router.get("/transactions", response_model=list[FinanceTransactionRead])
def list_finance_transactions_endpoint(
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=500),
    offset: int = Query(0, ge=0),
    kind: FinanceKind | None = Query(None),
):
    return list_finance_transactions(db, limit=limit, offset=offset, kind=kind)
